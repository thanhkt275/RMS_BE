
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { StageType } from '../../utils/prisma-types';
import { validateHierarchicalDateRange } from '../../users/dto/validation.utils';

// Get the base schema without refinements and make it partial
const BaseStageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Stage name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  type: z.nativeEnum(StageType, {
    errorMap: () => ({ message: 'Invalid stage type' }),
  }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  tournamentId: z.string().uuid('Tournament ID must be a valid UUID'),
  maxTeams: z.number().int().positive('Max teams must be a positive integer').optional(),
  isElimination: z.boolean().default(false),
  advancementRules: z.string().optional(),
});

// Define the Zod schema for stage updates - making all fields optional
export const UpdateStageSchema = BaseStageSchema.partial().refine(
  data => {
    // Only validate if both dates are provided
    if (data.startDate && data.endDate) {
      const validation = validateHierarchicalDateRange(
        { startDate: data.startDate, endDate: data.endDate },
        {
          minDuration: 0.5, // Minimum 30 minutes duration
          maxDuration: 24 * 7 // Maximum 1 week duration for a single stage
        }
      );
      return validation.isValid;
    }
    return true;
  }, {
    message: 'Invalid stage date range - must be between 30 minutes and 1 week duration',
    path: ['endDate'],
  }
);

// Create a DTO class from the Zod schema
export class UpdateStageDto extends createZodDto(UpdateStageSchema) {}