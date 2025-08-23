import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { validateHierarchicalDateRange } from '../../users/dto/validation.utils';

// Define the Zod schema for tournament creation
export const CreateTournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required'),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  adminId: z.string().uuid('Admin ID must be a valid UUID'),
  numberOfFields: z.coerce.number().int().min(1).max(20).default(1),
  registrationDeadline: z.coerce.date().optional(),
}).refine(data => {
  const validation = validateHierarchicalDateRange(
    { startDate: data.startDate, endDate: data.endDate },
    {
      minDuration: 1, // Minimum 1 hour duration
      maxDuration: 24 * 30 * 6 // Maximum 6 months duration
    }
  );
  return validation.isValid;
}, {
  message: 'Invalid tournament date range',
  path: ['endDate'],
}).refine(data => {
  // Validate registration deadline if provided
  if (data.registrationDeadline) {
    return data.registrationDeadline <= data.endDate;
  }
  return true;
}, {
  message: 'Registration deadline must be before or on tournament end date',
  path: ['registrationDeadline'],
}).refine(data => {
  // Tournament should start in the future (with some tolerance for immediate tournaments)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return data.startDate >= oneDayAgo;
}, {
  message: 'Tournament start date cannot be more than 1 day in the past',
  path: ['startDate'],
});

// Create a DTO class from the Zod schema
export class CreateTournamentDto extends createZodDto(CreateTournamentSchema) {}