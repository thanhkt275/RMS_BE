import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailsService } from '../emails/emails.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../utils/prisma-types';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma';

@Injectable()
export class UsersService {
  private readonly bcryptRounds = 12;
  private readonly defaultPageSize = 10;
  private readonly maxPageSize = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailsService: EmailsService,
  ) { }

  /**
   * Create a new user with hashed password
   */
  async create(createUserDto: CreateUserDto) {
    try {
      await this.validateUserCreation(createUserDto);

      const hashedPassword = await this.hashPassword(createUserDto.password);

      const userData: Prisma.UserCreateInput = {
        name: createUserDto.name,
        username: createUserDto.username,
        password: hashedPassword,
        role: createUserDto.role || UserRole.COMMON,
        email: createUserDto.email,
        phoneNumber: createUserDto.phoneNumber ?? '',
        gender: createUserDto.gender,
        DateOfBirth: createUserDto.DateOfBirth,
      };

      if (createUserDto.createdById) {
        userData.createdBy = { connect: { id: createUserDto.createdById } };
      }

      const newUser = await this.prisma.user.create({
        data: userData,
        select: this.getUserSelectFields(),
      });

      const activationToken = await this.jwtService.signAsync(
        { email: createUserDto.email },
        { expiresIn: '7d' },
      );
      await this.emailsService.sendAccountActivationInvite(
        createUserDto.email,
        `${process.env.FRONTEND_URL}/verify?token=${activationToken}`,
      );

      return newUser;
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
    isActive?: boolean,
  ) {
    const { skip, take } = this.validateAndNormalizePagination(page, limit);
    const where = this.buildUserWhereClause(role, search, isActive);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: this.getUserSelectFields(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
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

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.getUserSelectFields(),
        email: true,
        phoneNumber: true,
        gender: true,
        isActive: true,
        lastLoginAt: true,
        emailVerified: true,
      },
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
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: this.getUserSelectFields(),
      });
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
      return await this.prisma.user.update({
        where: { id },
        data: { role: newRole },
        select: this.getUserSelectFields(),
      });
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
      return await this.prisma.user.delete({
        where: { id },
        select: { id: true, username: true },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Get user statistics by role
   */
  async getUserStats(): Promise<Record<UserRole, number>> {
    const stats = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { isActive: true },
    });

    // Initialize all roles with 0
    const result = Object.values(UserRole).reduce(
      (acc, role) => {
        acc[role] = 0;
        return acc;
      },
      {} as Record<UserRole, number>,
    );

    // Fill in actual counts
    stats.forEach((stat) => {
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

    return await this.prisma.user.findMany({
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
    });
  }

  /**
   * Bulk delete users
   */
  async bulkDelete(
    ids: string[],
    currentUserId?: string,
  ): Promise<{ deleted: number }> {
    if (!ids.length) {
      throw new BadRequestException('No user IDs provided');
    }

    // Validate all IDs
    ids.forEach((id) => this.validateUuid(id));

    // Prevent self-deletion
    if (currentUserId && ids.includes(currentUserId)) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Check for admins in the list
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true },
    });

    const adminIds = users
      .filter((u) => u.role === UserRole.ADMIN)
      .map((u) => u.id);

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

      return { deleted: result.count };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Bulk change user roles
   */
  async bulkChangeRole(
    ids: string[],
    newRole: UserRole,
    currentUserId?: string,
  ): Promise<{ updated: number }> {
    if (!ids.length) {
      throw new BadRequestException('No user IDs provided');
    }

    // Validate all IDs
    ids.forEach((id) => this.validateUuid(id));

    // Prevent changing own role away from admin
    if (
      currentUserId &&
      ids.includes(currentUserId) &&
      newRole !== UserRole.ADMIN
    ) {
      throw new BadRequestException('Cannot change your own admin role');
    }

    try {
      const result = await this.prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { role: newRole },
      });

      return { updated: result.count };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Find user by username for authentication
   */
  async findByUsername(username: string) {
    return await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
        isActive: true,
      },
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

  private async validateUserCreation(
    createUserDto: CreateUserDto,
  ): Promise<void> {
    // Check username uniqueness
    if (await this.isUsernameExists(createUserDto.username)) {
      throw new ConflictException('Username already exists');
    }
    // Ensure no further code executes after throwing
    if (await this.isEmailExists(createUserDto.email)) {
      throw new ConflictException('Email already exists');
    }
    // Ensure no further code executes after throwing
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

  private async validateUserUpdate(
    updateUserDto: UpdateUserDto,
    existingUser: any,
  ): Promise<void> {
    // Check username uniqueness if changing
    if (
      updateUserDto.username &&
      updateUserDto.username !== existingUser.username
    ) {
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
    if (updateUserDto.phoneNumber !== undefined)
      data.phoneNumber = updateUserDto.phoneNumber;
    if (updateUserDto.gender !== undefined) data.gender = updateUserDto.gender;
    if (updateUserDto.role) data.role = updateUserDto.role;

    if (updateUserDto.password) {
      data.password = await this.hashPassword(updateUserDto.password);
    }

    return data;
  }

  private validateAndNormalizePagination(page: number, limit: number) {
    const normalizedPage = Math.max(1, Math.floor(page));
    const normalizedLimit = Math.min(
      this.maxPageSize,
      Math.max(1, Math.floor(limit)),
    );
    const skip = (normalizedPage - 1) * normalizedLimit;

    return { skip, take: normalizedLimit };
  }

  private buildUserWhereClause(
    role?: UserRole,
    search?: string,
    isActive?: boolean,
  ) {
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
      phoneNumber: true, // Changed from phone to phoneNumber to match the schema
      gender: true,
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
    const count = await this.prisma.user.count({
      where: { username },
    });
    return count > 0;
  }

  private async isEmailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  private async validateNotLastAdmin(): Promise<void> {
    const adminCount = await this.prisma.user.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    if (adminCount <= 1) {
      throw new BadRequestException('Cannot remove the last admin user');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  private validateUuid(id: string): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid UUID format');
    }
  }

  private handlePrismaError(error: any): never {
    // Check if this is a Prisma error with a code
    if (error.code) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }

      // Handle record not found errors
      if (error.code === 'P2025') {
        throw new NotFoundException('Record not found');
      }
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      const messages = error.errors.map((err: any) => {
        if (err.path.includes('gender')) {
          return `Gender must be one of: MALE, FEMALE, or OTHER`;
        }
        return `${err.path.join('.')}: ${err.message}`;
      });
      throw new BadRequestException(`Validation failed: ${messages.join(', ')}`);
    }

    // If the error is already a NestJS exception, rethrow it
    if (error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof BadRequestException) {
      throw error;
    }

    // Log unexpected errors
    console.error('Unexpected Prisma error:', error);
    throw new BadRequestException('An unexpected error occurred');
  }
}