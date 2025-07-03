import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../utils/prisma-types';
import { AuthSecurityService } from './auth-security.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private authSecurityService: AuthSecurityService,
  ) {}
  async validateUser(username: string, password: string, clientIp: string): Promise<any> {
    // Check if account is locked
    if (await this.authSecurityService.isAccountLocked(username)) {
      await this.authSecurityService.recordFailedAttempt(username, clientIp);
      throw new UnauthorizedException('Account temporarily locked due to too many failed attempts. Try again later.');
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      await this.authSecurityService.recordFailedAttempt(username, clientIp);
      // Use generic message to prevent username enumeration
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      await this.authSecurityService.recordFailedAttempt(username, clientIp);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Record successful login
    await this.authSecurityService.recordSuccessfulLogin(username, clientIp);
    
    const { password: _, ...result } = user;
    return result;
  }
  async register(registerDto: RegisterDto): Promise<any> {
    try {
      // Check for existing username or email with generic error
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: registerDto.username },
            ...(registerDto.email ? [{ email: registerDto.email }] : []),
          ],
        },
      });

      if (existingUser) {
        // Generic error to prevent enumeration
        throw new ConflictException('Registration failed. Please try different credentials.');
      }

      const role = registerDto.role || UserRole.COMMON;
      const hashedPassword = await bcrypt.hash(registerDto.password, 12); // Increased rounds

      const userData: any = {
        username: registerDto.username,
        password: hashedPassword,
        role: role,
      };

      if (registerDto.email) {
        userData.email = registerDto.email;
      }

      const newUser = await this.prisma.user.create({
        data: userData,
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
      });

      this.logger.log(`New user registered: ${newUser.username} with role ${newUser.role}`);
      return newUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      
      this.logger.error('Registration failed', error);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  async createDefaultAdmin() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    try {
      // Check if admin already exists
      const existingAdmin = await this.prisma.user.findUnique({
        where: { username: adminUsername },
        select: {
          id: true,
          username: true,
          role: true
        }
      });

      if (existingAdmin) {
        return { message: 'Admin user already exists' };
      }      // Create default admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await this.prisma.user.create({
        data: {
          username: adminUsername,
          password: hashedPassword,
          role: UserRole.ADMIN,
        },
      });

      return { message: `Default admin user created successfully (username: ${adminUsername})` };
    } catch (error) {
      console.error('Error creating default admin account:', error.message);
      throw new BadRequestException('Failed to create admin account: ' + error.message);
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