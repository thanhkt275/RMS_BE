import { UserRole } from '../../utils/prisma-types';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Gender } from '../../../generated/prisma';

// Custom validation functions
const emailValidation = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must not exceed 255 characters');

const passwordValidation = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  );

const usernameValidation = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must not exceed 50 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens',
  );

const phoneValidation = z
  .string()
  .regex(
    /^0\d{9}$/,
    'Phone number must start with 0 and be 10 digits long',
  )
  .nullable()
  .optional();


const dateOfBirthValidation = z
  .date()
  .max(new Date(), 'Date of birth cannot be in the future')
  .min(new Date('1900-01-01'), 'Date of birth must be after 1900')
  .optional();




// Define the Zod schema for user creation
export const CreateUserSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must not exceed 100 characters'),
    email: emailValidation,
    username: usernameValidation,
    password: passwordValidation,
    role: z
      .nativeEnum(UserRole, {
        errorMap: () => ({ message: 'Invalid user role' }),
      })
      .optional(),
    phoneNumber: phoneValidation,
    gender: z
      .nativeEnum(Gender, {
        errorMap: () => ({ message: 'Invalid gender' }),
      })
      .optional(),
    createdById: z.string().uuid('Creator ID must be a valid UUID').optional(),
    DateOfBirth: dateOfBirthValidation,
  })
  .strict(); // Prevent additional properties

// Create a DTO class from the Zod schema
export class CreateUserDto extends createZodDto(CreateUserSchema) { }
