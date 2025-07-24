import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ParseEnumPipe,
  ParseBoolPipe,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  ChangeRoleDto,
  BulkOperationDto,
} from './dto/update-user.dto';
import {
  UserQueryDto,
  UserSearchDto,
  UserExportDto,
} from './dto/user-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserOperationGuard } from './guards/user-operation.guard';
import { ApiResponseInterceptor } from './interceptors/api-response.interceptor';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/prisma-types';
import { Request } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard) // Apply JWT guard to all endpoints
@UseInterceptors(ApiResponseInterceptor) // Standardize API responses
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user - Admin only
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const currentUserId = this.getCurrentUserId(req);
    const userWithCreator = { ...createUserDto, createdById: currentUserId };
    return await this.usersService.create(userWithCreator);
  }

  /**
   * Get paginated list of users with filtering and search
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
    @Query('isActive', new DefaultValuePipe(true), ParseBoolPipe)
    isActive?: boolean,
  ) {
    this.validatePaginationParams(page, limit);
    return await this.usersService.findAll(page, limit, role, search, isActive);
  }

  /**
   * Get user statistics - Admin only
   */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUserStats() {
    return await this.usersService.getUserStats();
  }

  /**
   * Search users by query - Admin and Head Referee
   */
  @Get('search')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  async searchUsers(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (!query?.trim()) {
      throw new BadRequestException('Search query is required');
    }
    return await this.usersService.searchUsers(query, limit);
  }

  /**
   * Get user details by ID
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  async findOne(@Param('id') id: string) {
    this.validateUuidParam(id);
    return await this.usersService.findOne(id);
  }

  /**
   * Update user information - Admin only
   */
  @Patch(':id')
  @UseGuards(RolesGuard, UserOperationGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    this.validateUuidParam(id);
    return await this.usersService.update(id, updateUserDto);
  }

  /**
   * Change user role - Admin only
   */
  @Patch(':id/role')
  @UseGuards(RolesGuard, UserOperationGuard)
  @Roles(UserRole.ADMIN)
  async changeRole(
    @Param('id') id: string,
    @Body() changeRoleDto: ChangeRoleDto,
    @Req() req: Request,
  ) {
    this.validateUuidParam(id);
    const currentUserId = this.getCurrentUserId(req);
    return await this.usersService.changeRole(
      id,
      changeRoleDto.role,
      currentUserId,
    );
  }

  /**
   * Delete user - Admin only
   */
  @Delete(':id')
  @UseGuards(RolesGuard, UserOperationGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: Request) {
    this.validateUuidParam(id);
    const currentUserId = this.getCurrentUserId(req);
    await this.usersService.remove(id, currentUserId);
    return { message: 'User deleted successfully' };
  }

  /**
   * Bulk delete users - Admin only
   */
  @Post('bulk-delete')
  @UseGuards(RolesGuard, UserOperationGuard)
  @Roles(UserRole.ADMIN)
  async bulkDelete(
    @Body() bulkOperationDto: BulkOperationDto,
    @Req() req: Request,
  ) {
    console.log(
      '[Controller] Received bulk delete request:',
      JSON.stringify(bulkOperationDto, null, 2),
    );

    this.validateBulkOperation(bulkOperationDto, 'delete');
    const currentUserId = this.getCurrentUserId(req);
    return await this.usersService.bulkDelete(
      bulkOperationDto.userIds,
      currentUserId,
    );
  }

  /**
   * Bulk change user roles - Admin only
   */
  @Post('bulk-role')
  @UseGuards(RolesGuard, UserOperationGuard)
  @Roles(UserRole.ADMIN)
  async bulkChangeRole(
    @Body() bulkOperationDto: BulkOperationDto,
    @Req() req: Request,
  ) {
    console.log(
      '[Controller] Received bulk role change request:',
      JSON.stringify(bulkOperationDto, null, 2),
    );

    this.validateBulkOperation(bulkOperationDto, 'changeRole');
    if (!bulkOperationDto.role) {
      throw new BadRequestException('Role is required for bulk role change');
    }
    const currentUserId = this.getCurrentUserId(req);
    return await this.usersService.bulkChangeRole(
      bulkOperationDto.userIds,
      bulkOperationDto.role,
      currentUserId,
    );
  }

  /**
   * Export users - Admin only
   */
  @Post('export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async exportUsers(
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
    @Query('isActive', new DefaultValuePipe(true), ParseBoolPipe)
    isActive?: boolean,
  ) {
    // For now, return filtered users data for export
    // In a full implementation, this would generate CSV/Excel files
    const result = await this.usersService.findAll(
      1,
      1000,
      role,
      search,
      isActive,
    );
    return {
      data: result.users,
      total: result.pagination.total,
      exportedAt: new Date().toISOString(),
      filters: { role, search, isActive },
    };
  }

  /**
   * Get current user profile
   */
  @Get('profile/me')
  async getMyProfile(@Req() req: Request) {
    const currentUserId = this.getCurrentUserId(req);
    return await this.usersService.findOne(currentUserId);
  }

  /**
   * Update current user profile (limited fields)
   */
  @Patch('profile/me')
  async updateMyProfile(
    @Req() req: Request,
    @Body() updateDto: Partial<UpdateUserDto>,
  ) {
    const currentUserId = this.getCurrentUserId(req);
    // Restrict what users can update about themselves
    const allowedUpdates = this.filterAllowedProfileUpdates(updateDto);
    return await this.usersService.update(currentUserId, allowedUpdates);
  }

  // Private helper methods following SOLID principles

  /**
   * Extract current user ID from request
   */
  private getCurrentUserId(req: Request): string {
    // Add debugging to understand what's in req.user
    console.log(
      '[getCurrentUserId] req.user:',
      JSON.stringify(req.user, null, 2),
    );
    console.log('[getCurrentUserId] req.user type:', typeof req.user);
    console.log(
      '[getCurrentUserId] req.user keys:',
      req.user ? Object.keys(req.user) : 'no user',
    );

    const userId = req.user?.['sub'] || req.user?.['id'];
    console.log('[getCurrentUserId] Extracted userId:', userId);

    if (!userId) {
      console.error(
        '[getCurrentUserId] Unable to extract user ID from request',
      );
      throw new BadRequestException('Unable to identify current user');
    }
    return userId;
  }

  /**
   * Validate UUID parameter format
   */
  private validateUuidParam(id: string): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid UUID format');
    }
  }

  /**
   * Validate pagination parameters
   */
  private validatePaginationParams(page: number, limit: number): void {
    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
  }

  /**
   * Validate bulk operation parameters
   */
  private validateBulkOperation(
    dto: BulkOperationDto,
    expectedAction: string,
  ): void {
    if (dto.action !== expectedAction) {
      throw new BadRequestException(
        `Invalid action. Expected: ${expectedAction}`,
      );
    }
    if (!dto.userIds || dto.userIds.length === 0) {
      throw new BadRequestException('User IDs are required');
    }
    if (dto.userIds.length > 50) {
      throw new BadRequestException(
        'Cannot perform bulk operation on more than 50 users at once',
      );
    }
  }

  /**
   * Filter allowed profile updates for regular users
   */
  private filterAllowedProfileUpdates(
    updateDto: Partial<UpdateUserDto>,
  ): Partial<UpdateUserDto> {
    const allowedFields = ['email', 'phoneNumber', 'gender', 'dateOfBirth'];
    return Object.keys(updateDto)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateDto[key];
        return obj;
      }, {} as Partial<UpdateUserDto>);
  }
}
