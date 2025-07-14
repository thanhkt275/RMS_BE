import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { UserRole } from '../utils/prisma-types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  const mockUser = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    username: 'testuser',
    password: 'hashed-password',
    role: UserRole.COMMON,
    email: 'test@example.com',
    phoneNumber: '+1234567890',
    gender: true, // Boolean as per schema
    dateOfBirth: new Date('1990-01-01'),
    avatar: null,
    isActive: true,
    lastLoginAt: new Date(),
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: '123e4567-e89b-42d3-a456-426614174001',
    createdBy: {
      id: '123e4567-e89b-42d3-a456-426614174001',
      username: 'creator',
    },
  };

  const mockCreateUserDto: CreateUserDto = {
    username: 'newuser',
    password: 'password123',
    role: UserRole.COMMON,
    email: 'newuser@example.com',
    phoneNumber: '+1234567890',
    gender: false, // Boolean as per schema
    dateOfBirth: new Date('1995-01-01'),
    createdById: '123e4567-e89b-42d3-a456-426614174001',
  };

  beforeEach(async () => {
    jest
      .spyOn(bcrypt, 'hash')
      .mockImplementation(async (password) => `hashed-${password}`);

    prisma = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      // Mock validation methods
      prisma.user.count.mockResolvedValueOnce(0); // Username doesn't exist
      prisma.user.count.mockResolvedValueOnce(0); // Email doesn't exist
      prisma.user.findUnique.mockResolvedValueOnce(mockUser); // Creator exists

      const createdUser = { ...mockUser, password: 'hashed-password123' };
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.create(mockCreateUserDto);

      expect(result).toEqual(createdUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: mockCreateUserDto.username,
          password: 'hashed-password123',
          role: mockCreateUserDto.role,
          email: mockCreateUserDto.email,
          phoneNumber: mockCreateUserDto.phoneNumber,
          gender: mockCreateUserDto.gender,
          dateOfBirth: mockCreateUserDto.dateOfBirth,
          createdById: mockCreateUserDto.createdById,
        },
        select: expect.any(Object),
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(mockCreateUserDto.password, 12);
    });

    it('should throw ConflictException if username already exists', async () => {
      prisma.user.count.mockResolvedValueOnce(1); // Username exists

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.count.mockResolvedValueOnce(0); // Username doesn't exist
      prisma.user.count.mockResolvedValueOnce(1); // Email exists

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if creator does not exist', async () => {
      prisma.user.count.mockResolvedValueOnce(0); // Username doesn't exist
      prisma.user.count.mockResolvedValueOnce(0); // Email doesn't exist
      prisma.user.findUnique.mockResolvedValueOnce(null); // Creator doesn't exist

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should handle Prisma errors properly', async () => {
      prisma.user.count.mockResolvedValueOnce(0);
      prisma.user.count.mockResolvedValueOnce(0);
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      prisma.user.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['username'] },
      });

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users with default parameters', async () => {
      const users = [mockUser];
      const total = 1;

      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(total);

      const result = await service.findAll();

      expect(result).toEqual({
        users,
        pagination: {
          total,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should filter users by role', async () => {
      const users = [{ ...mockUser, role: UserRole.ADMIN }];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      await service.findAll(1, 10, UserRole.ADMIN);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
        skip: 0,
        take: 10,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search users by query', async () => {
      const users = [mockUser];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      await service.findAll(1, 10, undefined, 'test');

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: { contains: 'test', mode: 'insensitive' } },
            { email: { contains: 'test', mode: 'insensitive' } },
            { phoneNumber: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by active status', async () => {
      const users = [mockUser];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      await service.findAll(1, 10, undefined, undefined, true);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 10,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle pagination correctly', async () => {
      const users = [mockUser];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(25);

      const result = await service.findAll(2, 10);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });

      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: expect.objectContaining({
          id: true,
          username: true,
          email: true,
          phoneNumber: true,
          gender: true,
          dateOfBirth: true,
          isActive: true,
          lastLoginAt: true,
          emailVerified: true,
        }),
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('123e4567-e89b-42d3-a456-426614174999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      username: 'updateduser',
      email: 'updated@example.com',
      password: 'newpassword123',
    };

    it('should update a user successfully', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser); // For findUserById
      prisma.user.count.mockResolvedValueOnce(0); // Username doesn't exist
      prisma.user.count.mockResolvedValueOnce(0); // Email doesn't exist

      const updatedUser = {
        ...mockUser,
        ...updateDto,
        password: 'hashed-newpassword123',
      };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateDto);

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          username: updateDto.username,
          email: updateDto.email,
          password: 'hashed-newpassword123',
        },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('123e4567-e89b-42d3-a456-426614174998', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if username already exists', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      prisma.user.count.mockResolvedValueOnce(1); // Username exists

      await expect(service.update(mockUser.id, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('changeRole', () => {
    it('should change user role successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, role: UserRole.ADMIN };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.changeRole(mockUser.id, UserRole.ADMIN);

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { role: UserRole.ADMIN },
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException when trying to change own admin role', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      prisma.user.findUnique.mockResolvedValue(adminUser);

      await expect(
        service.changeRole(mockUser.id, UserRole.COMMON, mockUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when removing last admin', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      prisma.user.findUnique.mockResolvedValue(adminUser);
      prisma.user.count.mockResolvedValue(1); // Only one admin

      await expect(
        service.changeRole(mockUser.id, UserRole.COMMON),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const deletedUser = { id: mockUser.id, username: mockUser.username };
      prisma.user.delete.mockResolvedValue(deletedUser as any);

      const result = await service.remove(mockUser.id);

      expect(result).toEqual(deletedUser);
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { id: true, username: true },
      });
    });

    it('should throw BadRequestException when trying to delete own account', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.remove(mockUser.id, mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when deleting last admin', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      prisma.user.findUnique.mockResolvedValue(adminUser);
      prisma.user.count.mockResolvedValue(1); // Only one admin

      await expect(service.remove(mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('123e4567-e89b-42d3-a456-426614174997'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics by role', async () => {
      const mockStats = [
        { role: UserRole.ADMIN, _count: { id: 2 } },
        { role: UserRole.COMMON, _count: { id: 5 } },
      ];
      prisma.user.groupBy.mockResolvedValue(mockStats as any);

      const result = await service.getUserStats();

      expect(result).toEqual({
        [UserRole.ADMIN]: 2,
        [UserRole.HEAD_REFEREE]: 0,
        [UserRole.ALLIANCE_REFEREE]: 0,
        [UserRole.TEAM_LEADER]: 0,
        [UserRole.TEAM_MEMBER]: 0,
        [UserRole.COMMON]: 5,
      });
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const users = [
        {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role,
        },
      ];
      prisma.user.findMany.mockResolvedValue(users as any);

      const result = await service.searchUsers('test');

      expect(result).toEqual(users);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { username: { contains: 'test', mode: 'insensitive' } },
                { email: { contains: 'test', mode: 'insensitive' } },
                { phoneNumber: { contains: 'test', mode: 'insensitive' } },
              ],
            },
          ],
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
        },
        take: 20,
        orderBy: { username: 'asc' },
      });
    });

    it('should return empty array for empty query', async () => {
      const result = await service.searchUsers('');
      expect(result).toEqual([]);
    });
  });

  describe('bulkDelete', () => {
    const userIds = [
      '123e4567-e89b-42d3-a456-426614174002',
      '123e4567-e89b-42d3-a456-426614174003',
    ];

    it('should delete multiple users successfully', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: '123e4567-e89b-42d3-a456-426614174002',
          role: UserRole.COMMON,
        } as any,
        {
          id: '123e4567-e89b-42d3-a456-426614174003',
          role: UserRole.COMMON,
        } as any,
      ]);
      prisma.user.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkDelete(userIds);

      expect(result).toEqual({ deleted: 2 });
    });

    it('should throw BadRequestException for empty array', async () => {
      await expect(service.bulkDelete([])).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to delete own account', async () => {
      await expect(
        service.bulkDelete(
          ['123e4567-e89b-42d3-a456-426614174002'],
          '123e4567-e89b-42d3-a456-426614174002',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deleting all admins', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: '123e4567-e89b-42d3-a456-426614174002',
          role: UserRole.ADMIN,
        } as any,
        {
          id: '123e4567-e89b-42d3-a456-426614174003',
          role: UserRole.ADMIN,
        } as any,
      ]);
      prisma.user.count.mockResolvedValue(2); // Total admins = 2

      await expect(service.bulkDelete(userIds)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('bulkChangeRole', () => {
    const userIds = [
      '123e4567-e89b-42d3-a456-426614174004',
      '123e4567-e89b-42d3-a456-426614174005',
    ];

    it('should change role for multiple users', async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkChangeRole(
        userIds,
        UserRole.TEAM_MEMBER,
      );

      expect(result).toEqual({ updated: 2 });
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: userIds } },
        data: { role: UserRole.TEAM_MEMBER },
      });
    });

    it('should throw BadRequestException for empty array', async () => {
      await expect(service.bulkChangeRole([], UserRole.COMMON)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when changing own admin role', async () => {
      await expect(
        service.bulkChangeRole(
          ['123e4567-e89b-42d3-a456-426614174004'],
          UserRole.COMMON,
          '123e4567-e89b-42d3-a456-426614174004',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const authUser = {
        id: mockUser.id,
        username: mockUser.username,
        password: mockUser.password,
        role: mockUser.role,
        isActive: mockUser.isActive,
      };
      prisma.user.findUnique.mockResolvedValue(authUser as any);

      const result = await service.findByUsername(mockUser.username);

      expect(result).toEqual(authUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: mockUser.username },
        select: {
          id: true,
          username: true,
          password: true,
          role: true,
          isActive: true,
        },
      });
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time', async () => {
      prisma.user.update.mockResolvedValue(mockUser);

      await service.updateLastLogin(mockUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should not throw error if update fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      prisma.user.update.mockRejectedValue(new Error('DB error'));

      await expect(service.updateLastLogin(mockUser.id)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // Additional helper methods tests
  describe('private helper methods', () => {
    describe('validateUuid', () => {
      it('should throw BadRequestException for invalid UUID', async () => {
        await expect(service.findOne('invalid-uuid')).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.findOne('123')).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.findOne('')).rejects.toThrow(BadRequestException);
      });

      it('should accept valid UUIDs', async () => {
        prisma.user.findUnique.mockResolvedValue(mockUser);

        await expect(
          service.findOne('123e4567-e89b-42d3-a456-426614174000'),
        ).resolves.not.toThrow();
      });
    });

    describe('handlePrismaError', () => {
      it('should handle P2002 (unique constraint) error', async () => {
        prisma.user.count.mockResolvedValueOnce(0);
        prisma.user.count.mockResolvedValueOnce(0);
        prisma.user.findUnique.mockResolvedValueOnce(mockUser);
        prisma.user.create.mockRejectedValue({
          code: 'P2002',
          meta: { target: ['username'] },
        });

        await expect(service.create(mockCreateUserDto)).rejects.toThrow(
          ConflictException,
        );
      });

      it('should handle P2025 (record not found) error', async () => {
        prisma.user.findUnique.mockResolvedValueOnce(mockUser);
        prisma.user.count.mockResolvedValueOnce(0);
        prisma.user.count.mockResolvedValueOnce(0);
        prisma.user.update.mockRejectedValue({
          code: 'P2025',
        });

        await expect(
          service.update(mockUser.id, { username: 'newname' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should handle unexpected Prisma errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        prisma.user.count.mockResolvedValueOnce(0);
        prisma.user.count.mockResolvedValueOnce(0);
        prisma.user.findUnique.mockResolvedValueOnce(mockUser);
        prisma.user.create.mockRejectedValue({
          code: 'P9999',
          message: 'Unexpected error',
        });

        await expect(service.create(mockCreateUserDto)).rejects.toThrow(
          BadRequestException,
        );
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });
});
