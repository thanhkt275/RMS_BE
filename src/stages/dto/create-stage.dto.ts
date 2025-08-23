import { StageType } from '../../utils/prisma-types';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { validateHierarchicalDateRange } from '../../users/dto/validation.utils';

// Define the Zod schema for stage creation
export const CreateStageSchema = z.object({
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
}).refine(data => {
  const validation = validateHierarchicalDateRange(
    { startDate: data.startDate, endDate: data.endDate },
    {
      minDuration: 0.5, // Minimum 30 minutes duration
      maxDuration: 24 * 7 // Maximum 1 week duration for a single stage
    }
  );
  return validation.isValid;
}, {
  message: 'Invalid stage date range - must be between 30 minutes and 1 week duration',
  path: ['endDate'],
}).refine(data => {
  // Stage should not start more than 1 year in the future
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  return data.startDate <= oneYearFromNow;
}, {
  message: 'Stage start date cannot be more than 1 year in the future',
  path: ['startDate'],
});

// Create a DTO class from the Zod schema
export class CreateStageDto extends createZodDto(CreateStageSchema) {}