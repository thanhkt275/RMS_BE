import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthSecurityService } from './auth-security.service';
import { UsersService } from '../users/users.service';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Gender, UserRole } from '../utils/prisma-types';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: DeepMockProxy<PrismaService>;
  let mockJwtService: DeepMockProxy<JwtService>;
  let mockAuthSecurityService: DeepMockProxy<AuthSecurityService>;
  let mockUsersService: DeepMockProxy<UsersService>;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaService>();
    mockJwtService = mockDeep<JwtService>();
    mockAuthSecurityService = mockDeep<AuthSecurityService>();
    mockUsersService = mockDeep<UsersService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuthSecurityService, useValue: mockAuthSecurityService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      username: 'testuser',
      password: '$2b$12$hashedPassword',
      role: UserRole.COMMON,
      createdAt: new Date(),
      updatedAt: new Date(),
      email: 'test@example.com',
      gender: Gender.MALE,
      dateOfBirth: null,
      phoneNumber: '0123456789',
      createdById: null,
      avatar: null,
      isActive: true,
      lastLoginAt: null,
      emailVerified: true, // Changed to true so validation passes
    };

    it('should validate user with correct credentials', async () => {
      mockAuthSecurityService.isAccountLocked.mockResolvedValue(false);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser(
        'testuser',
        'password',
        '127.0.0.1',
      );

      expect(mockAuthSecurityService.isAccountLocked).toHaveBeenCalledWith(
        'testuser',
      );
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(
        mockAuthSecurityService.recordSuccessfulLogin,
      ).toHaveBeenCalledWith('testuser', '127.0.0.1');
      expect(result).toEqual({
        id: '1',
        name: 'Test User',
        username: 'testuser',
        role: UserRole.COMMON,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        email: 'test@example.com',
        gender: Gender.MALE,
        dateOfBirth: null,
        phoneNumber: '0123456789',
        createdById: null,
        avatar: null,
        isActive: true,
        lastLoginAt: null,
        emailVerified: true,
      });
    });

    it('should throw error if account is locked', async () => {
      mockAuthSecurityService.isAccountLocked.mockResolvedValue(true);

      await expect(
        service.validateUser('testuser', 'password', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthSecurityService.recordFailedAttempt).toHaveBeenCalledWith(
        'testuser',
        '127.0.0.1',
      );
    });

    it('should throw generic error for non-existent user', async () => {
      mockAuthSecurityService.isAccountLocked.mockResolvedValue(false);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent', 'password', '127.0.0.1'),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(mockAuthSecurityService.recordFailedAttempt).toHaveBeenCalledWith(
        'nonexistent',
        '127.0.0.1',
      );
    });

    it('should throw generic error for invalid password', async () => {
      mockAuthSecurityService.isAccountLocked.mockResolvedValue(false);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.validateUser('testuser', 'wrongpassword', '127.0.0.1'),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(mockAuthSecurityService.recordFailedAttempt).toHaveBeenCalledWith(
        'testuser',
        '127.0.0.1',
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      username: 'newuser',
      password: 'Test123!@#',
      email: 'test@example.com',
      name: 'John Doe',
      phoneNumber: '0123456789',
      role: UserRole.COMMON,
      gender: Gender.MALE,
    };

    it('should register a new user successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const newUser = {
        id: '1',
        username: 'newuser',
        name: 'John Doe',
        email: 'test@example.com',
        phoneNumber: '0123456789',
        role: UserRole.COMMON,
        gender: Gender.MALE,
        createdAt: new Date(),
      };
      mockUsersService.create.mockResolvedValue(newUser as any);

      const result = await service.register(registerDto);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: 'newuser' },
            { email: 'test@example.com' },
            { name: 'John Doe' },
            { phoneNumber: '0123456789' },
          ],
        },
      });
      expect(mockUsersService.create).toHaveBeenCalledWith({
        name: 'John Doe',
        username: 'newuser',
        email: 'test@example.com',
        password: 'Test123!@#',
        phoneNumber: '0123456789',
        role: UserRole.COMMON,
        gender: Gender.MALE,
      });
      expect(result).toEqual({
        id: '1',
        username: 'newuser',
        role: UserRole.COMMON,
        createdAt: newUser.createdAt,
      });
    });

    it('should throw generic error if user already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: '1' } as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException(
          'Registration failed. Please try different credentials.',
        ),
      );
    });

    it('should detect duplicate username', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: '1',
        username: 'newuser',
      } as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException(
          'Registration failed. Please try different credentials.',
        ),
      );

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: 'newuser' },
            { email: 'test@example.com' },
            { name: 'John Doe' },
            { phoneNumber: '0123456789' },
          ],
        },
      });
    });

    it('should detect duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      } as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException(
          'Registration failed. Please try different credentials.',
        ),
      );
    });

    it('should detect duplicate name', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: '1',
        name: 'John Doe',
      } as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException(
          'Registration failed. Please try different credentials.',
        ),
      );
    });

    it('should detect duplicate phoneNumber', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: '1',
        phoneNumber: '0123456789',
      } as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException(
          'Registration failed. Please try different credentials.',
        ),
      );
    });

    it('should default to COMMON role if not specified', async () => {
      const dtoWithoutRole = {
        username: 'newuser',
        password: 'Test123!@#',
        email: 'test@example.com',
        name: 'John Doe',
        phoneNumber: '0123456789',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      const newUser = {
        id: '1',
        username: 'newuser',
        name: 'John Doe',
        email: 'test@example.com',
        phoneNumber: '0123456789',
        role: UserRole.COMMON,
        createdAt: new Date(),
      };
      mockUsersService.create.mockResolvedValue(newUser as any);

      await service.register(dtoWithoutRole);

      expect(mockUsersService.create).toHaveBeenCalledWith({
        name: 'John Doe',
        username: 'newuser',
        email: 'test@example.com',
        password: 'Test123!@#',
        phoneNumber: '0123456789',
        role: UserRole.COMMON,
        gender: undefined,
      });
    });

    it('should handle registration errors gracefully', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should generate JWT token for valid user', async () => {
      const user = {
        id: '1',
        username: 'testuser',
        role: UserRole.COMMON,
      };

      const token = 'jwt-token';
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        username: 'testuser',
        sub: '1',
        role: UserRole.COMMON,
      });
      expect(result).toEqual({
        access_token: token,
        user: {
          id: '1',
          username: 'testuser',
          role: UserRole.COMMON,
        },
      });
    });
  });

  describe('createDefaultAdmin', () => {
    beforeEach(() => {
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_PASSWORD = 'admin123';
    });

    it('should create default admin if none exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const adminUser = {
        id: '1',
        username: 'admin',
        name: 'Admin',
        email: 'thanhtran@steamforvietnam.org',
        phoneNumber: '1234567890',
        role: UserRole.ADMIN,
        createdAt: new Date(),
      };
      mockUsersService.create.mockResolvedValue(adminUser as any);

      const result = await service.createDefaultAdmin();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'admin' },
        select: { id: true, username: true, role: true },
      });
      expect(mockUsersService.create).toHaveBeenCalledWith({
        name: 'Admin',
        username: 'admin',
        email: 'thanhtran@steamforvietnam.org',
        password: 'admin123',
        role: UserRole.ADMIN,
        phoneNumber: '1234567890',
      });
      expect(result.message).toContain(
        'Default admin user created successfully',
      );
    });

    it('should return message if admin already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        username: 'admin',
        role: UserRole.ADMIN,
      } as any);

      const result = await service.createDefaultAdmin();

      expect(result.message).toBe('Admin user already exists');
    });

    it('should use default credentials if env vars not set', async () => {
      delete process.env.ADMIN_USERNAME;
      delete process.env.ADMIN_PASSWORD;

      mockPrisma.user.findUnique.mockResolvedValue(null);
      const adminUser = {
        id: '1',
        username: 'admin',
        name: 'Admin',
        email: 'thanhtran@steamforvietnam.org',
        phoneNumber: '1234567890',
        role: UserRole.ADMIN,
        createdAt: new Date(),
      };
      mockUsersService.create.mockResolvedValue(adminUser as any);

      await service.createDefaultAdmin();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'admin' },
        select: { id: true, username: true, role: true },
      });
      expect(mockUsersService.create).toHaveBeenCalledWith({
        name: 'Admin',
        username: 'admin',
        email: 'thanhtran@steamforvietnam.org',
        password: 'admin123',
        role: UserRole.ADMIN,
        phoneNumber: '1234567890',
      });
    });
  });
});
