import { z } from 'zod';

/**
 * Common validation schemas and utilities for user DTOs
 * Implements reusable validation logic following DRY principles
 */

// Password strength validation
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])?/;
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
export const PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;

// Common validation schemas
export const CommonValidations = {
  // Enhanced password validation with strength requirements
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])/,
      'Password must contain at least one lowercase letter'
    )
    .regex(
      /^(?=.*[A-Z])/,
      'Password must contain at least one uppercase letter'
    )
    .regex(
      /^(?=.*\d)/,
      'Password must contain at least one number'
    )
    .refine((password) => {
      // Check for common weak passwords
      const weakPasswords = [
        'password', 'password123', '12345678', 'qwerty123',
        'admin123', 'letmein', 'welcome123', 'password1'
      ];
      return !weakPasswords.includes(password.toLowerCase());
    }, 'Password is too common and insecure'),

  // Username validation with enhanced rules
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(USERNAME_REGEX, 'Username can only contain letters, numbers, underscores, and hyphens')
    .refine((username) => {
      // Reserved usernames that cannot be used
      const reserved = ['admin', 'root', 'system', 'test', 'user', 'null', 'undefined'];
      return !reserved.includes(username.toLowerCase());
    }, 'Username is reserved and cannot be used'),

  // Email validation with enhanced rules
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email address must not exceed 255 characters')
    .refine((email) => {
      // Basic domain validation
      const domain = email.split('@')[1];
      return domain && domain.includes('.') && domain.length > 3;
    }, 'Please enter a valid email domain'),

  // Phone number validation with international support
  phoneNumber: z
    .string()
    .regex(PHONE_REGEX, 'Please enter a valid phone number')
    .refine((phone) => {
      // Remove all non-digit characters for length check
      const digits = phone.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    }, 'Phone number must be between 7 and 15 digits'),

  // Date of birth validation
  dateOfBirth: z
    .date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .min(new Date('1900-01-01'), 'Date of birth must be after 1900')
    .refine((date) => {
      // Check if user is at least 13 years old (COPPA compliance)
      const thirteenYearsAgo = new Date();
      thirteenYearsAgo.setFullYear(thirteenYearsAgo.getFullYear() - 13);
      return date <= thirteenYearsAgo;
    }, 'User must be at least 13 years old'),

  // UUID validation
  uuid: z
    .string()
    .uuid('Please provide a valid UUID'),

  // Reason/comment validation
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must not exceed 1000 characters')
    .refine((reason) => {
      // Ensure reason is meaningful (not just repeated characters)
      const uniqueChars = new Set(reason.toLowerCase().replace(/\s/g, ''));
      return uniqueChars.size >= 3;
    }, 'Please provide a meaningful reason'),

  // URL validation for avatars
  avatarUrl: z
    .string()
    .url('Please enter a valid URL')
    .max(500, 'URL must not exceed 500 characters')
    .refine((url) => {
      // Only allow HTTPS URLs for security
      return url.startsWith('https://');
    }, 'Avatar URL must use HTTPS'),

  // Search query validation
  searchQuery: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s@._-]+$/, 'Search query contains invalid characters')
    .refine((query) => {
      // Prevent SQL injection patterns
      const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b)/i;
      return !sqlPatterns.test(query);
    }, 'Search query contains invalid patterns'),
};

// Date range validation helper
export const createDateRangeSchema = (maxRangeMonths: number = 12) => z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  (data) => data.startDate <= data.endDate,
  {
    message: 'Start date must be before or equal to end date',
    path: ['startDate'],
  }
).refine(
  (data) => {
    const monthsDiff = (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsDiff <= maxRangeMonths;
  },
  {
    message: `Date range cannot exceed ${maxRangeMonths} months`,
    path: ['endDate'],
  }
);

// Pagination validation helper
export const createPaginationSchema = (maxLimit: number = 100) => z.object({
  page: z.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(10000, 'Page cannot exceed 10000'),
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(maxLimit, `Limit cannot exceed ${maxLimit}`),
});

// Bulk operation validation helper
export const createBulkOperationSchema = (maxItems: number = 50) => z.object({
  ids: z.array(CommonValidations.uuid)
    .min(1, 'At least one ID is required')
    .max(maxItems, `Cannot perform bulk operation on more than ${maxItems} items`)
    .refine((ids) => {
      // Ensure no duplicate IDs
      return new Set(ids).size === ids.length;
    }, 'Duplicate IDs are not allowed'),
});

// Password confirmation helper
export const createPasswordConfirmationSchema = (passwordField: string = 'password') => z.object({
  [passwordField]: CommonValidations.password,
  confirmPassword: z.string(),
}).refine(
  (data) => data[passwordField] === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

// Export type helpers for TypeScript
export type DateRangeInput = z.infer<ReturnType<typeof createDateRangeSchema>>;
export type PaginationInput = z.infer<ReturnType<typeof createPaginationSchema>>;
export type BulkOperationInput = z.infer<ReturnType<typeof createBulkOperationSchema>>;
