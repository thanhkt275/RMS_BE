
import { createZodDto } from 'nestjs-zod';
import { CreateUserSchema } from './create-user.dto';
import { UserRole } from '../../utils/prisma-types';
import { z } from 'zod';

// Define the Zod schema for user updates - making all fields optional
export const UpdateUserSchema = CreateUserSchema.partial().omit({
  createdById: true // Don't allow changing creator in updates
}).extend({
  isActive: z.boolean().optional(), // Add isActive field for user status updates
  
  // Override phoneNumber validation to be more flexible in updates
  phoneNumber: z.string()
    .regex(/^0\d{9}$/, 'Phone number must start with 0 and be 10 digits long')
    .nullable()
    .optional(),
});

// Define the Zod schema for role changes with enhanced validation
export const ChangeRoleSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid user role' }),
  }),
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  effectiveDate: z.date().optional(), // When the role change should take effect
}).strict();

// Define the Zod schema for bulk operations with enhanced validation
export const BulkOperationSchema = z.object({
  userIds: z.array(z.string().uuid('Invalid user ID format'))
    .min(1, 'At least one user ID is required')
    .max(50, 'Cannot perform bulk operation on more than 50 users at once'),
  action: z.enum(['delete', 'changeRole'], {
    errorMap: () => ({ message: 'Action must be either "delete" or "changeRole"' }),
  }),
  role: z.nativeEnum(UserRole).optional(),
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must not exceed 500 characters')
    .optional(),
})
  .refine(
    (data) => {
      if (data.action === 'changeRole') {
        return data.role !== undefined;
      }
      return true;
    },
    {
      message: 'Role is required when action is "changeRole"',
      path: ['role'],
    }
  )
  .refine(
    (data) => {
      // Require reason for all bulk operations
      return data.reason !== undefined && data.reason.trim().length >= 5;
    },
    {
      message: 'Reason is required for all bulk operations and must be at least 5 characters',
      path: ['reason'],
    }
  );

// Define the Zod schema for password reset
export const PasswordResetSchema = z.object({
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  confirmPassword: z.string(),
  reason: z.string()
    .min(5, 'Reason for password reset must be at least 5 characters')
    .max(200, 'Reason must not exceed 200 characters'),
}).strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Define the Zod schema for user activation/deactivation
export const UserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must not exceed 500 characters'),
}).strict();

// Define the Zod schema for profile updates (limited fields for self-updates)
export const ProfileUpdateSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .optional(),
  phoneNumber: z.string()
    .optional(),
  gender: z.boolean().optional(),
  DateOfBirth: z.date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .min(new Date('1900-01-01'), 'Date of birth must be after 1900')
    .optional(),
  avatar: z.string()
    .url('Avatar must be a valid URL')
    .max(500, 'Avatar URL must not exceed 500 characters')
    .refine((url) => url.startsWith('https://'), {
      message: 'Avatar URL must use HTTPS',
    })
    .optional(),
}).strict();

// Create DTO classes from the Zod schemas
export class UpdateUserDto extends createZodDto(UpdateUserSchema) { }
export class ChangeRoleDto extends createZodDto(ChangeRoleSchema) { }
export class BulkOperationDto extends createZodDto(BulkOperationSchema) { }
export class PasswordResetDto extends createZodDto(PasswordResetSchema) { }
export class UserStatusDto extends createZodDto(UserStatusSchema) { }
export class ProfileUpdateDto extends createZodDto(ProfileUpdateSchema) { }