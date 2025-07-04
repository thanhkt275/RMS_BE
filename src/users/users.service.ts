import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../utils/prisma-types';
import * as bcrypt from 'bcrypt';

/**
 * Users Service with Prisma Accelerate Caching Strategy
 * 
 * Cache Strategy Overview:
 * - User Lists (findAll): TTL 10min, SWR 30min - moderate change frequency
 * - User Profiles (findOne): TTL 30min, SWR 1h - infrequent changes
 * - User Stats: TTL 30min, SWR 1.5h - very infrequent changes
 * - Search Results: TTL 5min, SWR 15min - frequent changes
 * - Auth Data: TTL 1h, SWR 2h - rarely changes
 * - Existence Checks: TTL 30min, SWR 1h - rarely change
 * - Admin Count: TTL 10min, SWR 30min - critical data, needs freshness
 * 
 * Cache Tags:
 * - Functional: users_list, user_stats, users_search, user_auth
 * - Hierarchical: user_{id}, users_role_{role}, users_active_{boolean}
 * - Specific: username_exists_{username}, email_exists_{email}
 */
@Injectable()
export class UsersService {
  private readonly bcryptRounds = 12;
  private readonly defaultPageSize = 10;
  private readonly maxPageSize = 100;

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user with hashed password
   */
  async create(createUserDto: CreateUserDto) {
    await this.validateUserCreation(createUserDto);
    
    const hashedPassword = await this.hashPassword(createUserDto.password);
    
    try {
      const user = await this.prisma.user.create({
        data: {
          username: createUserDto.username,
          password: hashedPassword,
          role: createUserDto.role,
          email: createUserDto.email,
          phoneNumber: createUserDto.phoneNumber,
          gender: createUserDto.gender,
          DateOfBirth: createUserDto.DateOfBirth,
          createdById: createUserDto.createdById,
        },
        select: this.getUserSelectFields(),
      });

      // Invalidate related caches
      await this.invalidateUserCaches(['users_list', 'users_count', 'user_stats', `users_role_${createUserDto.role}`]);

      return user;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Get paginated list of users with filtering and search
   */
  async findAll(
    page: number = 1, 
    limit: number = this.defaultPageSize, 
    role?: UserRole, 
    search?: string,
    isActive?: boolean
  ) {
    const { skip, take } = this.validateAndNormalizePagination(page, limit);
    const where = this.buildUserWhereClause(role, search, isActive);

    // Create cache tags based on filters for targeted invalidation
    const cacheTagsBase = ['users_list'];
    if (role) cacheTagsBase.push(`users_role_${role}`);
    if (isActive !== undefined) cacheTagsBase.push(`users_active_${isActive}`);
    if (search) cacheTagsBase.push('users_search');

    const [users, total] = await Promise.all([
      this.prisma.accelerated.user.findMany({
        where,
        skip,
        take,
        select: this.getUserSelectFields(),
        orderBy: { createdAt: 'desc' },
        cacheStrategy: {
          ttl: 600,    // 10 minutes - user lists change moderately
          swr: 1800,   // 30 minutes - serve stale while refreshing
          tags: [...cacheTagsBase, `users_page_${page}_limit_${take}`]
        }
      }),
      this.prisma.accelerated.user.count({ 
        where,
        cacheStrategy: {
          ttl: 900,    // 15 minutes - counts change less frequently
          swr: 2700,   // 45 minutes
          tags: [...cacheTagsBase, 'users_count']
        }
      }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
        hasNext: skip + take < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Find a single user by ID
   */
  async findOne(id: string) {
    this.validateUuid(id);
    
    const user = await this.prisma.accelerated.user.findUnique({
      where: { id },
      select: {
        ...this.getUserSelectFields(),
        email: true,
        phoneNumber: true,
        gender: true,
        DateOfBirth: true,
        isActive: true,
        lastLoginAt: true,
        emailVerified: true,
      },
      cacheStrategy: {
        ttl: 1800,   // 30 minutes - user profiles change infrequently
        swr: 3600,   // 1 hour
        tags: [`user_${id}`, 'user_profiles']
      }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Update user information
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    this.validateUuid(id);
    
    const existingUser = await this.findUserById(id);
    await this.validateUserUpdate(updateUserDto, existingUser);

    const updateData = await this.buildUpdateData(updateUserDto);

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: this.getUserSelectFields(),
      });

      // Invalidate user-specific and related caches
      await this.invalidateUserSpecificCaches(id, existingUser.username);
      await this.invalidateUserCaches(['users_list', 'users_search']);

      return updatedUser;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Change user role with validation
   */
  async changeRole(id: string, newRole: UserRole, currentUserId?: string) {
    this.validateUuid(id);
    
    const user = await this.findUserById(id);
    
    // Prevent changing own role to non-admin
    if (id === currentUserId && newRole !== UserRole.ADMIN) {
      throw new BadRequestException('Cannot change your own admin role');
    }

    // Prevent removing last admin
    if (user.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
      await this.validateNotLastAdmin();
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { role: newRole },
        select: this.getUserSelectFields(),
      });

      // Invalidate role-specific and user-specific caches
      await this.invalidateUserSpecificCaches(id, user.username);
      await this.invalidateUserCaches([
        'users_list', 
        'user_stats', 
        `users_role_${user.role}`, 
        `users_role_${newRole}`
      ]);

      return updatedUser;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Delete user with safety checks
   */
  async remove(id: string, currentUserId?: string) {
    this.validateUuid(id);
    
    const user = await this.findUserById(id);

    // Prevent self-deletion
    if (id === currentUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Prevent deletion of last admin
    if (user.role === UserRole.ADMIN) {
      await this.validateNotLastAdmin();
    }

    try {
      const deletedUser = await this.prisma.user.delete({
        where: { id },
        select: { id: true, username: true },
      });

      // Invalidate all related caches
      await this.invalidateUserSpecificCaches(id, user.username);
      await this.invalidateUserCaches([
        'users_list', 
        'users_count', 
        'user_stats', 
        `users_role_${user.role}`,
        'users_search'
      ]);

      return deletedUser;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Get user statistics by role
   */
  async getUserStats(): Promise<Record<UserRole, number>> {
    const stats = await this.prisma.accelerated.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { isActive: true },
      cacheStrategy: {
        ttl: 1800,   // 30 minutes - stats change infrequently
        swr: 5400,   // 1.5 hours
        tags: ['user_stats', 'users_count']
      }
    });

    // Initialize all roles with 0
    const result = Object.values(UserRole).reduce((acc, role) => {
      acc[role] = 0;
      return acc;
    }, {} as Record<UserRole, number>);

    // Fill in actual counts
    stats.forEach(stat => {
      result[stat.role] = stat._count.id;
    });

    return result;
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string, limit: number = 20): Promise<any[]> {
    if (!query.trim()) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();
    
    return await this.prisma.accelerated.user.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { username: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
              { phoneNumber: { contains: searchTerm, mode: 'insensitive' } },
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
      take: Math.min(limit, 50), // Cap at 50 results
      orderBy: { username: 'asc' },
      cacheStrategy: {
        ttl: 300,    // 5 minutes - search results change frequently
        swr: 900,    // 15 minutes
        tags: ['users_search', `search_${searchTerm.substring(0, 10)}`] // Limited tag length
      }
    });
  }

  /**
   * Bulk delete users
   */
  async bulkDelete(ids: string[], currentUserId?: string): Promise<{ deleted: number }> {
    if (!ids.length) {
      throw new BadRequestException('No user IDs provided');
    }

    // Validate all IDs
    ids.forEach(id => this.validateUuid(id));

    // Prevent self-deletion
    if (currentUserId && ids.includes(currentUserId)) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Check for admins in the list
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true },
    });

    const adminIds = users.filter(u => u.role === UserRole.ADMIN).map(u => u.id);
    
    if (adminIds.length > 0) {
      const totalAdmins = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      if (totalAdmins <= adminIds.length) {
        throw new BadRequestException('Cannot delete all admin users');
      }
    }

    try {
      const result = await this.prisma.user.deleteMany({
        where: { id: { in: ids } },
      });

      // Invalidate all related caches
      await this.invalidateUserCaches([
        'users_list', 
        'users_count', 
        'user_stats', 
        'users_search',
        ...Object.values(UserRole).map(role => `users_role_${role}`)
      ]);

      return { deleted: result.count };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Bulk change user roles
   */
  async bulkChangeRole(ids: string[], newRole: UserRole, currentUserId?: string): Promise<{ updated: number }> {
    if (!ids.length) {
      throw new BadRequestException('No user IDs provided');
    }

    // Validate all IDs
    ids.forEach(id => this.validateUuid(id));

    // Prevent changing own role away from admin
    if (currentUserId && ids.includes(currentUserId) && newRole !== UserRole.ADMIN) {
      throw new BadRequestException('Cannot change your own admin role');
    }

    try {
      const result = await this.prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { role: newRole },
      });

      // Invalidate role-specific caches
      await this.invalidateUserCaches([
        'users_list', 
        'user_stats',
        ...Object.values(UserRole).map(role => `users_role_${role}`)
      ]);

      return { updated: result.count };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Find user by username for authentication
   */
  async findByUsername(username: string) {
    return await this.prisma.accelerated.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
        isActive: true,
      },
      cacheStrategy: {
        ttl: 3600,   // 1 hour - user auth data changes rarely
        swr: 7200,   // 2 hours
        tags: [`user_auth_${username}`, 'user_auth']
      }
    });
  }

  /**
   * Update last login time
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      // Log error but don't throw - login should still work
      console.error('Failed to update last login time:', error);
    }
  }

  // Private helper methods

  private async validateUserCreation(createUserDto: CreateUserDto): Promise<void> {
    // Check username uniqueness
    if (await this.isUsernameExists(createUserDto.username)) {
      throw new ConflictException('Username already exists');
    }

    // Check email uniqueness if provided
    if (createUserDto.email && await this.isEmailExists(createUserDto.email)) {
      throw new ConflictException('Email already exists');
    }

    // Validate creator exists if provided
    if (createUserDto.createdById) {
      const creator = await this.prisma.user.findUnique({
        where: { id: createUserDto.createdById },
        select: { id: true },
      });
      
      if (!creator) {
        throw new BadRequestException('Creator user not found');
      }
    }
  }

  private async validateUserUpdate(updateUserDto: UpdateUserDto, existingUser: any): Promise<void> {
    // Check username uniqueness if changing
    if (updateUserDto.username && updateUserDto.username !== existingUser.username) {
      if (await this.isUsernameExists(updateUserDto.username)) {
        throw new ConflictException('Username already exists');
      }
    }

    // Check email uniqueness if changing
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      if (await this.isEmailExists(updateUserDto.email)) {
        throw new ConflictException('Email already exists');
      }
    }
  }

  private async buildUpdateData(updateUserDto: UpdateUserDto): Promise<any> {
    const data: any = {};

    if (updateUserDto.username) data.username = updateUserDto.username;
    if (updateUserDto.email !== undefined) data.email = updateUserDto.email;
    if (updateUserDto.phoneNumber !== undefined) data.phoneNumber = updateUserDto.phoneNumber;
    if (updateUserDto.gender !== undefined) data.gender = updateUserDto.gender;
    if (updateUserDto.DateOfBirth !== undefined) data.DateOfBirth = updateUserDto.DateOfBirth;
    if (updateUserDto.role) data.role = updateUserDto.role;

    if (updateUserDto.password) {
      data.password = await this.hashPassword(updateUserDto.password);
    }

    return data;
  }

  private validateAndNormalizePagination(page: number, limit: number) {
    const normalizedPage = Math.max(1, Math.floor(page));
    const normalizedLimit = Math.min(this.maxPageSize, Math.max(1, Math.floor(limit)));
    const skip = (normalizedPage - 1) * normalizedLimit;

    return { skip, take: normalizedLimit };
  }

  private buildUserWhereClause(role?: UserRole, search?: string, isActive?: boolean) {
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search?.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { username: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phoneNumber: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private getUserSelectFields() {
    return {
      id: true,
      username: true,
      role: true,
      email: true,
      phoneNumber: true,
      gender: true,
      DateOfBirth: true,
      isActive: true,
      lastLoginAt: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          username: true,
        },
      },
    };
  }

  private async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, username: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  private async isUsernameExists(username: string): Promise<boolean> {
    const count = await this.prisma.accelerated.user.count({
      where: { username },
      cacheStrategy: {
        ttl: 1800,   // 30 minutes - username existence rarely changes
        swr: 3600,   // 1 hour
        tags: [`username_exists_${username}`, 'username_checks']
      }
    });
    return count > 0;
  }

  private async isEmailExists(email: string): Promise<boolean> {
    const count = await this.prisma.accelerated.user.count({
      where: { email },
      cacheStrategy: {
        ttl: 1800,   // 30 minutes - email existence rarely changes
        swr: 3600,   // 1 hour
        tags: [`email_exists_${email}`, 'email_checks']
      }
    });
    return count > 0;
  }

  private async validateNotLastAdmin(): Promise<void> {
    const adminCount = await this.prisma.accelerated.user.count({
      where: { role: UserRole.ADMIN, isActive: true },
      cacheStrategy: {
        ttl: 600,    // 10 minutes - admin count is critical and should be fresh
        swr: 1800,   // 30 minutes
        tags: ['admin_count', 'user_stats']
      }
    });

    if (adminCount <= 1) {
      throw new BadRequestException('Cannot remove the last admin user');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  private validateUuid(id: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid UUID format');
    }
  }

  // Cache management methods

  /**
   * Invalidate specific user-related cache tags
   */
  private async invalidateUserCaches(tags: string[]): Promise<void> {
    try {
      await this.prisma.invalidateCache(tags);
    } catch (error) {
      // Log error but don't throw - cache invalidation failure shouldn't break functionality
      console.error('Failed to invalidate user caches:', error);
    }
  }

  /**
   * Invalidate user-specific caches
   */
  private async invalidateUserSpecificCaches(userId: string, username?: string): Promise<void> {
    const tags = [`user_${userId}`, 'user_profiles'];
    if (username) {
      tags.push(`user_auth_${username}`);
    }
    await this.invalidateUserCaches(tags);
  }

  private handlePrismaError(error: any): never {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new ConflictException(`${field} already exists`);
    }
    
    if (error.code === 'P2025') {
      throw new NotFoundException('Record not found');
    }

    // Log unexpected errors
    console.error('Unexpected Prisma error:', error);
    throw new BadRequestException('An unexpected error occurred');
  }
}