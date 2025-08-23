import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { validateHierarchicalDateRange } from '../../users/dto/validation.utils';

// Get the base schema without refinements and make it partial
const BaseTournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required'),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  adminId: z.string().uuid('Admin ID must be a valid UUID'),
  numberOfFields: z.coerce.number().int().min(1).max(20).default(1),
  registrationDeadline: z.coerce.date().optional(),
});

// Define the Zod schema for tournament updates - making all fields optional
export const UpdateTournamentSchema = BaseTournamentSchema.partial().refine(
  data => {
    // Only validate if both dates are provided
    if (data.startDate && data.endDate) {
      const validation = validateHierarchicalDateRange(
        { startDate: data.startDate, endDate: data.endDate },
        {
          minDuration: 1, // Minimum 1 hour duration
          maxDuration: 24 * 30 * 6 // Maximum 6 months duration
        }
      );
      return validation.isValid;
    }
    return true;
  }, {
    message: 'Invalid tournament date range',
    path: ['endDate'],
  }
).refine(
  data => {
    // Validate registration deadline if provided
    if (data.registrationDeadline && data.endDate) {
      return data.registrationDeadline <= data.endDate;
    }
    return true;
  }, {
    message: 'Registration deadline must be before or on tournament end date',
    path: ['registrationDeadline'],
  }
);
// numberOfFields is now included as an optional property via CreateTournamentSchema.partial()

// Create a DTO class from the Zod schema
export class UpdateTournamentDto extends createZodDto(UpdateTournamentSchema) {}