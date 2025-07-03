import { StageType } from '../../utils/prisma-types';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Define the Zod schema for stage creation
export const CreateStageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.nativeEnum(StageType, {
    errorMap: () => ({ message: 'Invalid stage type' }),
  }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  tournamentId: z.string().uuid('Tournament ID must be a valid UUID'),
}).refine(data => data.startDate <= data.endDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Create a DTO class from the Zod schema
export class CreateStageDto extends createZodDto(CreateStageSchema) {}