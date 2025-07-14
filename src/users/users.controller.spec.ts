import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { UserRole } from '../utils/prisma-types';
import { Request } from 'express';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: DeepMockProxy<UsersService>;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockRequest = {
    user: { sub: 'test-user-id', role: UserRole.ADMIN },
  } as unknown as Request;

  // Helper function to create mock user data matching service return type
  const createMockUser = (overrides: Partial<any> = {}) => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    role: UserRole.TEAM_LEADER,
    email: 'test@example.com',
    phoneNumber: null,
    gender: null,
    dateOfBirth: null,
    isActive: true,
    lastLoginAt: null,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    ...overrides,
  });

  // Helper for complete user stats
  const createMockStats = () => ({
    [UserRole.ADMIN]: 2,
    [UserRole.HEAD_REFEREE]: 5,
    [UserRole.ALLIANCE_REFEREE]: 3,
    [UserRole.TEAM_LEADER]: 10,
    [UserRole.TEAM_MEMBER]: 25,
    [UserRole.COMMON]: 15,
  });

  beforeEach(async () => {
    // Create a deep mock of PrismaClient to avoid any database interactions
    mockPrisma = mockDeep<PrismaClient>();
    mockUsersService = mockDeep<UsersService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    // Reset all mock calls and implementations
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user with creator ID', async () => {
      const createUserDto = {
        username: 'testuser',
        password: 'password123',
        role: UserRole.TEAM_LEADER,
        email: 'test@example.com',
      };

      const expectedResult = createMockUser({
        id: 'new-user-id',
        username: createUserDto.username,
        role: createUserDto.role,
        email: createUserDto.email,
      });

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto, mockRequest);

      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...createUserDto,
        createdById: 'test-user-id',
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const expectedResult = {
        users: [createMockUser({ id: '1', username: 'user1' })],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockUsersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(
        1,
        10,
        UserRole.ADMIN,
        'search',
        true,
      );

      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        1,
        10,
        UserRole.ADMIN,
        'search',
        true,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should validate pagination parameters', async () => {
      await expect(controller.findAll(0, 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.findAll(1, 101)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const expectedUser = createMockUser({ id: userId, username: 'testuser' });
      mockUsersService.findOne.mockResolvedValue(expectedUser);

      const result = await controller.findOne(userId);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedUser);
    });

    it('should validate UUID format', async () => {
      await expect(controller.findOne('invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const query = 'john';
      const expectedResult = [{ id: '1', username: 'john_doe' }];
      mockUsersService.searchUsers.mockResolvedValue(expectedResult);

      const result = await controller.searchUsers(query, 20);

      expect(mockUsersService.searchUsers).toHaveBeenCalledWith(query, 20);
      expect(result).toEqual(expectedResult);
    });

    it('should require search query', async () => {
      await expect(controller.searchUsers('', 20)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.searchUsers('   ', 20)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateDto = { username: 'newusername' };
      const expectedResult = createMockUser({
        id: userId,
        username: 'newusername',
      });
      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(userId, updateDto, mockRequest);

      expect(mockUsersService.update).toHaveBeenCalledWith(userId, updateDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('changeRole', () => {
    it('should change user role', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const changeRoleDto = {
        role: UserRole.HEAD_REFEREE,
        reason: 'Promoting to head referee due to excellent performance',
      };
      const expectedResult = createMockUser({
        id: userId,
        role: UserRole.HEAD_REFEREE,
      });
      mockUsersService.changeRole.mockResolvedValue(expectedResult);

      const result = await controller.changeRole(
        userId,
        changeRoleDto,
        mockRequest,
      );

      expect(mockUsersService.changeRole).toHaveBeenCalledWith(
        userId,
        UserRole.HEAD_REFEREE,
        'test-user-id',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockUsersService.remove.mockResolvedValue({
        id: userId,
        username: 'deleteduser',
      });

      const result = await controller.remove(userId, mockRequest);

      expect(mockUsersService.remove).toHaveBeenCalledWith(
        userId,
        'test-user-id',
      );
      expect(result).toEqual({ message: 'User deleted successfully' });
    });
  });

  describe('bulkDelete', () => {
    it('should bulk delete users', async () => {
      const bulkOperationDto = {
        userIds: ['user1', 'user2'],
        action: 'delete' as const,
      };
      mockUsersService.bulkDelete.mockResolvedValue({ deleted: 2 });

      const result = await controller.bulkDelete(bulkOperationDto, mockRequest);

      expect(mockUsersService.bulkDelete).toHaveBeenCalledWith(
        ['user1', 'user2'],
        'test-user-id',
      );
      expect(result).toEqual({ deleted: 2 });
    });

    it('should validate bulk operation parameters', async () => {
      const invalidDto = {
        userIds: [],
        action: 'delete' as const,
      };

      await expect(
        controller.bulkDelete(invalidDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkChangeRole', () => {
    it('should bulk change user roles', async () => {
      const bulkOperationDto = {
        userIds: ['user1', 'user2'],
        action: 'changeRole' as const,
        role: UserRole.TEAM_MEMBER,
      };
      mockUsersService.bulkChangeRole.mockResolvedValue({ updated: 2 });

      const result = await controller.bulkChangeRole(
        bulkOperationDto,
        mockRequest,
      );

      expect(mockUsersService.bulkChangeRole).toHaveBeenCalledWith(
        ['user1', 'user2'],
        UserRole.TEAM_MEMBER,
        'test-user-id',
      );
      expect(result).toEqual({ updated: 2 });
    });

    it('should require role for bulk role change', async () => {
      const invalidDto = {
        userIds: ['user1'],
        action: 'changeRole' as const,
      };

      await expect(
        controller.bulkChangeRole(invalidDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const expectedStats = createMockStats();
      mockUsersService.getUserStats.mockResolvedValue(expectedStats);

      const result = await controller.getUserStats();

      expect(mockUsersService.getUserStats).toHaveBeenCalled();
      expect(result).toEqual(expectedStats);
    });
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      const expectedProfile = createMockUser({
        id: 'test-user-id',
        username: 'currentuser',
      });
      mockUsersService.findOne.mockResolvedValue(expectedProfile);

      const result = await controller.getMyProfile(mockRequest);

      expect(mockUsersService.findOne).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(expectedProfile);
    });
  });

  describe('updateMyProfile', () => {
    it('should update current user profile with allowed fields only', async () => {
      const updateDto = {
        email: 'new@example.com',
        username: 'hackername', // This should be filtered out
        role: UserRole.ADMIN, // This should be filtered out
        phoneNumber: '123-456-7890',
      };
      const expectedResult = createMockUser({
        id: 'test-user-id',
        email: 'new@example.com',
      });
      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.updateMyProfile(mockRequest, updateDto);

      expect(mockUsersService.update).toHaveBeenCalledWith('test-user-id', {
        email: 'new@example.com',
        phoneNumber: '123-456-7890',
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
