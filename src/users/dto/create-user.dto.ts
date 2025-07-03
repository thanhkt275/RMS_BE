import { UserRole } from '../../utils/prisma-types';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Custom validation functions
const passwordValidation = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one lowercase letter, one uppercase letter, and one number'
  );

const usernameValidation = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must not exceed 50 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens'
  );

const phoneNumberValidation = z
  .string()
  .regex(
    /^[\+]?[1-9][\d]{0,15}$/,
    'Phone number must be a valid international format'
  )
  .optional();

const emailValidation = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must not exceed 255 characters')
  .optional();

const dateOfBirthValidation = z
  .date()
  .max(new Date(), 'Date of birth cannot be in the future')
  .min(new Date('1900-01-01'), 'Date of birth must be after 1900')
  .optional();

// Define the Zod schema for user creation
export const CreateUserSchema = z.object({
  username: usernameValidation,
  password: passwordValidation,
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid user role' }),
  }),
  email: emailValidation,
  phoneNumber: phoneNumberValidation,
  gender: z.boolean().optional(),
  DateOfBirth: dateOfBirthValidation, // Note: Using DateOfBirth to match Prisma schema
  createdById: z.string().uuid('Creator ID must be a valid UUID').optional(),
}).strict(); // Prevent additional properties

// Create a DTO class from the Zod schema
export class CreateUserDto extends createZodDto(CreateUserSchema) {}