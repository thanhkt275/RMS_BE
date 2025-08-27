
import { createZodDto } from 'nestjs-zod';
import { CreateTournamentSchema } from './create-tournament.dto';
import { z } from 'zod';

// Extract the inner schema and make it partial
const baseSchema = CreateTournamentSchema instanceof z.ZodEffects 
  ? CreateTournamentSchema.innerType() 
  : CreateTournamentSchema;

// Define the Zod schema for tournament updates - making all fields optional
export const UpdateTournamentSchema = baseSchema.innerType().partial().refine(
  data => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
).refine(
  data => {
    if (!data.startDate || !data.endDate) return true;
    const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    return (data.endDate.getTime() - data.startDate.getTime()) <= maxDuration;
  }, {
    message: 'Tournament duration cannot exceed 1 year',
    path: ['endDate'],
  }
);
// numberOfFields is now included as an optional property via CreateTournamentSchema.partial()

// Create a DTO class from the Zod schema
export class UpdateTournamentDto extends createZodDto(UpdateTournamentSchema) {}