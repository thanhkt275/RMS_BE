import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { UserRole } from '../utils/prisma-types';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    jest.spyOn(bcrypt, 'hash').mockImplementation(async (pw) => 'hashed-' + pw);
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const now = new Date();
      const user = {
        id: 'u1',
        username: 'user',
        password: 'hashed-pass',
        role: UserRole.ADMIN,
        email: null,
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdAt: now,
        updatedAt: now,
        createdById: null,
      };
      prisma.user.create.mockResolvedValue(user);
      const dto = { username: 'user', password: 'pass', role: UserRole.ADMIN };
      const result = await service.create(dto as any);
      expect(result).toHaveProperty('id', 'u1');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: dto.username,
          password: 'hashed-pass',
          role: dto.role,
          createdById: undefined,
        },
      });
    });
    it('should throw if prisma throws', async () => {
      prisma.user.create.mockRejectedValue(new Error('DB error'));
      await expect(service.create({ username: 'user', password: 'pass', role: UserRole.ADMIN } as any)).rejects.toThrow('DB error');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const now = new Date();
      const user = {
        id: 'u1',
        username: 'user',
        password: 'hashed-pass',
        role: UserRole.ADMIN,
        email: null,
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdAt: now,
        updatedAt: now,
        createdById: null,
      };
      prisma.user.findMany.mockResolvedValue([user]);
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id', 'u1');
    });
    it('should throw if prisma throws', async () => {
      prisma.user.findMany.mockRejectedValue(new Error('DB error'));
      await expect(service.findAll()).rejects.toThrow('DB error');
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const now = new Date();
      const user = {
        id: 'u1',
        username: 'user',
        password: 'hashed-pass',
        role: UserRole.ADMIN,
        email: null,
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdAt: now,
        updatedAt: now,
        createdById: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      const result = await service.findOne('u1');
      expect(result).toHaveProperty('id', 'u1');
    });
    it('should throw if prisma throws', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('DB error'));
      await expect(service.findOne('u1')).rejects.toThrow('DB error');
    });
  });

  describe('update', () => {
    it('should update a user and hash password if provided', async () => {
      const now = new Date();
      const user = {
        id: 'u1',
        username: 'updated',
        password: 'hashed-newpass',
        role: UserRole.ADMIN,
        email: null,
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdAt: now,
        updatedAt: now,
        createdById: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);
      const dto = { username: 'updated', password: 'newpass', role: UserRole.ADMIN };
      const result = await service.update('u1', dto as any);
      expect(result).toHaveProperty('id', 'u1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          username: 'updated',
          password: 'hashed-newpass',
          role: UserRole.ADMIN,
        },
        select: expect.any(Object),
      });
    });
    it('should throw if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update('notfound', { username: 'fail' } as any)).rejects.toThrow('User with ID notfound not found');
    });
    it('should throw if prisma throws', async () => {
      const now = new Date();
      const user = {
        id: 'u1',
        username: 'user',
        password: 'hashed-pass',
        role: UserRole.ADMIN,
        email: null,
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdAt: now,
        updatedAt: now,
        createdById: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockRejectedValue(new Error('DB error'));
      await expect(service.update('u1', { username: 'fail' } as any)).rejects.toThrow('DB error');
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const now = new Date();
      const user = {
        id: 'u1',
        username: 'user',
        password: 'hashed-pass',
        role: UserRole.ADMIN,
        email: null,
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdAt: now,
        updatedAt: now,
        createdById: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.delete.mockResolvedValue(user);
      const result = await service.remove('u1');
      expect(result).toHaveProperty('id', 'u1');
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });
    it('should throw if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('notfound')).rejects.toThrow('User with ID notfound not found');
    });
    it('should throw if prisma throws', async () => {
      const now = new Date();
      const user = {
        id: 'u1',
        username: 'user',
        password: 'hashed-pass',
        role: UserRole.ADMIN,
        email: null,
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdAt: now,
        updatedAt: now,
        createdById: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.delete.mockRejectedValue(new Error('DB error'));
      await expect(service.remove('u1')).rejects.toThrow('DB error');
    });
  });
});
