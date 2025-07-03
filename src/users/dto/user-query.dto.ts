import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { UserRole } from '../../utils/prisma-types';

// Define the Zod schema for user search/query parameters with enhanced validation
export const UserQuerySchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1).optional(),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10).optional(),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid user role filter' }),
  }).optional(),
  search: z.string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query cannot exceed 100 characters')
    .optional(),
  isActive: z.boolean().default(true).optional(),
  sortBy: z.enum(['username', 'role', 'createdAt', 'email', 'lastLoginAt'], {
    errorMap: () => ({ message: 'Invalid sort field' }),
  }).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Sort order must be "asc" or "desc"' }),
  }).default('desc').optional(),
  createdAfter: z.date().optional(), // Filter users created after this date
  createdBefore: z.date().optional(), // Filter users created before this date
  lastLoginAfter: z.date().optional(), // Filter users who logged in after this date
  hasEmail: z.boolean().optional(), // Filter users with/without email
  emailVerified: z.boolean().optional(), // Filter by email verification status
}).strict()
  .refine(
    (data) => {
      if (data.createdAfter && data.createdBefore) {
        return data.createdAfter <= data.createdBefore;
      }
      return true;
    },
    {
      message: 'createdAfter must be before or equal to createdBefore',
      path: ['createdAfter'],
    }
  );

// Define the Zod schema for user search with enhanced validation
export const UserSearchSchema = z.object({
  q: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s@._-]+$/, 'Search query contains invalid characters'),
  limit: z.number().int()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Search limit cannot exceed 50')
    .default(20).optional(),
  includeInactive: z.boolean().default(false).optional(), // Include inactive users in search
  roleFilter: z.nativeEnum(UserRole).optional(), // Filter search results by role
}).strict();

// Define the Zod schema for export parameters with enhanced options
export const UserExportSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid user role for export' }),
  }).optional(),
  search: z.string()
    .max(100, 'Search query cannot exceed 100 characters')
    .optional(),
  isActive: z.boolean().default(true).optional(),
  format: z.enum(['csv', 'excel', 'json'], {
    errorMap: () => ({ message: 'Export format must be csv, excel, or json' }),
  }).default('csv').optional(),
  fields: z.array(z.enum([
    'id', 'username', 'email', 'role', 'phoneNumber', 
    'gender', 'DateOfBirth', 'isActive', 'emailVerified',
    'createdAt', 'updatedAt', 'lastLoginAt', 'createdBy'
  ], {
    errorMap: () => ({ message: 'Invalid field name for export' }),
  })).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  includeStats: z.boolean().default(false).optional(), // Include summary statistics
}).strict()
  .refine(
    (data) => {
      if (data.createdAfter && data.createdBefore) {
        return data.createdAfter <= data.createdBefore;
      }
      return true;
    },
    {
      message: 'createdAfter must be before or equal to createdBefore',
      path: ['createdAfter'],
    }
  );

// Define the Zod schema for user import validation
export const UserImportSchema = z.object({
  users: z.array(z.object({
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters'),
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email must not exceed 255 characters')
      .optional(),
    role: z.nativeEnum(UserRole, {
      errorMap: () => ({ message: 'Invalid user role' }),
    }),
    phoneNumber: z.string()
      .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
      .optional(),
    gender: z.boolean().optional(),
    DateOfBirth: z.date()
      .max(new Date(), 'Date of birth cannot be in the future')
      .min(new Date('1900-01-01'), 'Date of birth must be after 1900')
      .optional(),
  }).strict())
    .min(1, 'At least one user is required for import')
    .max(100, 'Cannot import more than 100 users at once'),
  skipDuplicates: z.boolean().default(true).optional(), // Skip users with existing usernames
  validateOnly: z.boolean().default(false).optional(), // Only validate without importing
  sendWelcomeEmail: z.boolean().default(false).optional(), // Send welcome email to imported users
}).strict();

// Define the Zod schema for user statistics request
export const UserStatsSchema = z.object({
  groupBy: z.enum(['role', 'createdDate', 'lastLogin', 'emailVerified'], {
    errorMap: () => ({ message: 'Invalid groupBy field for statistics' }),
  }).default('role').optional(),
  dateRange: z.enum(['7d', '30d', '90d', '1y', 'all'], {
    errorMap: () => ({ message: 'Invalid date range for statistics' }),
  }).default('30d').optional(),
  includeInactive: z.boolean().default(false).optional(),
}).strict();

// Create DTO classes from the Zod schemas
export class UserQueryDto extends createZodDto(UserQuerySchema) {}
export class UserSearchDto extends createZodDto(UserSearchSchema) {}
export class UserExportDto extends createZodDto(UserExportSchema) {}
export class UserImportDto extends createZodDto(UserImportSchema) {}
export class UserStatsDto extends createZodDto(UserStatsSchema) {}
