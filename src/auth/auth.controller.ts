import { Controller, Request, Post, UseGuards, Body, Get, UnauthorizedException, Res, HttpCode, ValidationPipe, Ip, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { UserRole } from '../utils/prisma-types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() clientIp: string
  ) {
    const user = await this.authService.validateUser(loginDto.username, loginDto.password, clientIp);
    const { access_token, user: userInfo } = await this.authService.login(user);

    // Set JWT as HTTP-only cookie
    res.cookie('token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Enhanced CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    this.logger.log(`User logged in: ${userInfo.username}`);
    return { user: userInfo, message: 'Login successful' };
  }
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
      message: 'Your authentication is working correctly'
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
      message: 'Your ADMIN role is working correctly'
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
          createdAt: true
        }
      });

      if (!user) {
        return {
          found: false,
          message: 'Admin user not found',
          expectedUsername: adminUsername
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
          passwordHashLength: user.password.length
        },
        passwordTest: {
          expectedPassword: adminPassword,
          passwordMatch: passwordMatch,
          hashStartsWith: user.password.substring(0, 10) + '...'
        }
      };
    } catch (error) {
      return {
        error: true,
        message: error.message
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
        where: { username: adminUsername }
      });

      // Create new admin user with proper password hash
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const newAdmin = await this.authService['prisma'].user.create({
        data: {
          username: adminUsername,
          password: hashedPassword,
          role: UserRole.ADMIN,
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true
        }
      });

      // Test the new password immediately
      const passwordTest = await bcrypt.compare(adminPassword, hashedPassword);

      return {
        success: true,
        message: 'Admin user recreated successfully',
        user: newAdmin,
        passwordTest: {
          expectedPassword: adminPassword,
          passwordMatch: passwordTest
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}