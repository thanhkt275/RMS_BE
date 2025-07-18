import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  Get,
  UnauthorizedException,
  Res,
  HttpCode,
  ValidationPipe,
  Ip,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../utils/prisma-types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from '../users/dto';
import { LoginDto } from './dto/login.dto';
import { ActivateDto } from './dto/activate.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }
  /*async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }*/

  @Post('verify')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async activate(@Body() activateDto: ActivateDto): Promise<void> {
    await this.authService.verifyEmail(activateDto.token);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() clientIp: string,
  ) {
    console.log(
      `Validating user: ${loginDto.username} ${loginDto.password} from IP: ${clientIp}`,
    );
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
      clientIp,
    );
    const { access_token, user: userInfo } = await this.authService.login(user);

    // Set JWT as HTTP-only cookie with production-safe settings
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite:
        process.env.NODE_ENV === 'production'
          ? ('none' as const)
          : ('strict' as const),
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      // Don't set domain for cross-origin requests unless specifically needed
      // ...(process.env.NODE_ENV === 'production' && {
      //   domain: process.env.COOKIE_DOMAIN || undefined
      // })
    };

    res.cookie('token', access_token, cookieOptions);

    this.logger.log(`User logged in: ${userInfo.username}`);

    // Return token in response body for cross-domain scenarios
    return {
      user: userInfo,
      message: 'Login successful',
      access_token: access_token, // Include token for frontend to store
    };
  }
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite:
        process.env.NODE_ENV === 'production'
          ? ('none' as const)
          : ('strict' as const),
      // Don't set domain for cross-origin requests unless specifically needed
      // ...(process.env.NODE_ENV === 'production' && {
      //   domain: process.env.COOKIE_DOMAIN || undefined
      // })
    });
    return { message: 'Logged out successfully' };
  }

  @Get('init-admin')
  @HttpCode(201)
  async initializeAdmin() {
    const admin = await this.authService.createDefaultAdmin();
    if ('role' in admin && 'username' in admin) {
      return admin;
    }
    // If only message is returned, still return 201 for idempotency
    return admin;
  }

  @Get('check-auth')
  @UseGuards(JwtAuthGuard)
  async checkAuth(@Request() req) {
    // This endpoint requires a valid JWT token
    return {
      authenticated: true,
      user: req.user,
      message: 'Your authentication is working correctly',
    };
  }

  @Get('check-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async checkAdminRole(@Request() req) {
    // This endpoint requires a valid JWT token AND the ADMIN role
    return {
      authenticated: true,
      role: req.user.role,
      hasAdminAccess: true,
      message: 'Your ADMIN role is working correctly',
    };
  }

  @Get('debug-admin')
  async debugAdmin() {
    try {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      // Find admin user
      const user = await this.authService['prisma'].user.findUnique({
        where: { username: adminUsername },
        select: {
          id: true,
          username: true,
          role: true,
          password: true, // Include password for debugging
          createdAt: true,
        },
      });

      if (!user) {
        return {
          found: false,
          message: 'Admin user not found',
          expectedUsername: adminUsername,
        };
      }

      // Test password validation
      const bcrypt = require('bcrypt');
      const passwordMatch = await bcrypt.compare(adminPassword, user.password);

      return {
        found: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          passwordHashLength: user.password.length,
        },
        passwordTest: {
          expectedPassword: adminPassword,
          passwordMatch: passwordMatch,
          hashStartsWith: user.password.substring(0, 10) + '...',
        },
      };
    } catch (error) {
      return {
        error: true,
        message: error.message,
      };
    }
  }

  @Get('force-recreate-admin')
  @HttpCode(201)
  async forceRecreateAdmin() {
    try {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      // Delete existing admin user if exists
      await this.authService['prisma'].user.deleteMany({
        where: { username: adminUsername },
      });

      // Create new admin user with proper password hash
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const newAdmin = await this.authService.createDefaultAdmin();

      // Test the new password immediately
      const passwordTest = await bcrypt.compare(adminPassword, hashedPassword);

      return {
        success: true,
        message: 'Admin user recreated successfully',
        user: newAdmin,
        passwordTest: {
          expectedPassword: adminPassword,
          passwordMatch: passwordTest,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('debug-env')
  debugEnvironment() {
    return {
      nodeEnv: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET,
      frontendUrl: process.env.FRONTEND_URL,
      cookieDomain: process.env.COOKIE_DOMAIN,
      adminUsername: process.env.ADMIN_USERNAME,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('debug-cookies')
  debugCookies(@Request() req) {
    return {
      cookies: req.cookies,
      headers: {
        cookie: req.headers.cookie,
        authorization: req.headers.authorization,
        origin: req.headers.origin,
        referer: req.headers.referer,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test-cookie')
  testCookie(@Res({ passthrough: true }) res: Response) {
    // Test cookie with various settings
    const testToken = 'test-token-12345';

    // Set multiple test cookies with different configurations
    res.cookie('test-token-strict', testToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie('test-token-none', testToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie('test-token-lax', testToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    return {
      message: 'Test cookies set',
      instructions:
        'Check your browser dev tools -> Application -> Cookies to see which cookies are set',
    };
  }

  @Get('read-cookies')
  readCookies(@Request() req) {
    return {
      allCookies: req.cookies,
      tokenCookie: req.cookies.token,
      testCookies: {
        strict: req.cookies['test-token-strict'],
        none: req.cookies['test-token-none'],
        lax: req.cookies['test-token-lax'],
      },
      headers: {
        cookie: req.headers.cookie,
        origin: req.headers.origin,
        host: req.headers.host,
      },
    };
  }

  @Post('login-debug')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async loginDebug(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() clientIp: string,
    @Request() req,
  ) {
    try {
      const user = await this.authService.validateUser(
        loginDto.username,
        loginDto.password,
        clientIp,
      );
      const { access_token, user: userInfo } =
        await this.authService.login(user);

      // Log the request details
      const requestInfo = {
        origin: req.headers.origin,
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
        forwardedFor: req.headers['x-forwarded-for'],
        clientIp: clientIp,
      };

      // Set JWT as HTTP-only cookie with detailed logging
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite:
          process.env.NODE_ENV === 'production'
            ? ('none' as const)
            : ('strict' as const),
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        ...(process.env.NODE_ENV === 'production' && {
          domain: process.env.COOKIE_DOMAIN || undefined,
        }),
      };

      res.cookie('token', access_token, cookieOptions);

      this.logger.log(`[LOGIN DEBUG] User logged in: ${userInfo.username}`);
      this.logger.log(
        `[LOGIN DEBUG] Cookie options: ${JSON.stringify(cookieOptions)}`,
      );
      this.logger.log(
        `[LOGIN DEBUG] Request info: ${JSON.stringify(requestInfo)}`,
      );

      return {
        user: userInfo,
        message: 'Login successful',
        debug: {
          environment: process.env.NODE_ENV,
          cookieOptions,
          requestInfo,
          tokenPreview: access_token.substring(0, 20) + '...',
        },
      };
    } catch (error) {
      this.logger.error(`[LOGIN DEBUG] Login failed: ${error.message}`);
      throw error;
    }
  }

  @Get('debug-headers')
  debugHeaders(@Request() req) {
    return {
      authorizationHeader: req.headers.authorization,
      cookieHeader: req.headers.cookie,
      allHeaders: {
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
        origin: req.headers.origin,
        referer: req.headers.referer,
        'user-agent': req.headers['user-agent'],
      },
      timestamp: new Date().toISOString(),
    };
  }
}
