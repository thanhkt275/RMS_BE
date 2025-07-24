import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../utils/prisma-types';
import { AuthSecurityService } from './auth-security.service';
import { RegisterDto } from './dto/register.dto';
import { ActivateDto } from './dto/activate.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly authSecurityService: AuthSecurityService,
  ) {}

  async validateUser(
    username: string,
    password: string,
    clientIp: string,
  ): Promise<any> {
    try {
      if (await this.authSecurityService.isAccountLocked(username)) {
        throw new UnauthorizedException(
          'Account temporarily locked due to too many failed attempts. Try again later.',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { username },
      });
      console.log(user);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.emailVerified) {
        throw new ForbiddenException('User must verify email first');
      }

      // Record successful login
      await this.authSecurityService.recordSuccessfulLogin(username, clientIp);

      const { password: _, ...result } = user;
      return result;
    } catch (err) {
      await this.authSecurityService.recordFailedAttempt(username, clientIp);
      throw err;
    }
  }

  async register(registerDto: RegisterDto): Promise<any> {
    try {
      // Check for existing username, email, name, or phoneNumber with generic error
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: registerDto.username },
            { email: registerDto.email },
            { name: registerDto.name },
            { phoneNumber: registerDto.phoneNumber },
          ],
        },
      });

      if (existingUser) {
        // Generic error to prevent enumeration
        throw new ConflictException(
          'Registration failed. Please try different credentials.',
        );
      }

      // Delegate to UsersService for complete user creation
      const newUser = await this.usersService.create({
        name: registerDto.name,
        username: registerDto.username,
        email: registerDto.email,
        password: registerDto.password,
        phoneNumber: registerDto.phoneNumber,
        role: registerDto.role || UserRole.COMMON,
        gender: registerDto.gender,
      });

      this.logger.log(
        `New user registered: ${newUser.username} with role ${newUser.role}`,
      );
      
      return {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Registration failed', error);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const decoded = this.jwtService.verify<{ email: string }>(token);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { email: decoded.email },
    });

    if (user.emailVerified) {
      throw new BadRequestException('Email has already been verified.');
    }

    await this.prisma.user.update({
      where: { email: decoded.email },
      data: { emailVerified: true },
    });
  }

  async createDefaultAdmin() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail =
      process.env.ADMIN_EMAIL || 'thanhtran@steamforvietnam.org';
    const adminPhone = process.env.ADMIN_PHONE || '1234567890';
    const adminName = process.env.ADMIN_NAME || 'Admin';

    try {
      // Check if admin already exists
      const existingAdmin = await this.prisma.user.findUnique({
        where: { username: adminUsername },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });

      if (existingAdmin) {
        return { message: 'Admin user already exists' };
      }

      await this.usersService.create({
        name: adminName,
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        role: UserRole.ADMIN,
        phoneNumber: adminPhone,
      });

      return {
        message: `Default admin user created successfully (username: ${adminUsername})`,
      };
    } catch (error) {
      console.error('Error creating default admin account:', error.message);
      throw new BadRequestException(
        'Failed to create admin account: ' + error.message,
      );
    }
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }
}
