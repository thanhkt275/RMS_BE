import { StageType } from '../../utils/prisma-types';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Define the Zod schema for stage creation
export const CreateStageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Stage name must be less than 100 characters'),
  type: z.nativeEnum(StageType, {
    errorMap: () => ({ message: 'Invalid stage type. Must be one of: SWISS, PLAYOFF, ROUND_ROBIN, SINGLE_ELIMINATION, DOUBLE_ELIMINATION' }),
  }),
  startDate: z.coerce.date().refine(date => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Start date cannot be in the past',
  }),
  endDate: z.coerce.date(),
  tournamentId: z.string().uuid('Tournament ID must be a valid UUID'),
}).refine(data => data.startDate <= data.endDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine(data => {
  const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  return (data.endDate.getTime() - data.startDate.getTime()) <= maxDuration;
}, {
  message: 'Stage duration cannot exceed 30 days',
  path: ['endDate'],
});

// Create a DTO class from the Zod schema
export class CreateStageDto extends createZodDto(CreateStageSchema) {}