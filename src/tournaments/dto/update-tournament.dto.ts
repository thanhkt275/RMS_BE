import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CreateTournamentSchema } from './create-tournament.dto';

// Define the Zod schema for tournament updates - making all fields optional
export const UpdateTournamentSchema = CreateTournamentSchema.innerType().partial().refine(
  data => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);
// numberOfFields is now included as an optional property via CreateTournamentSchema.partial()

// Create a DTO class from the Zod schema
export class UpdateTournamentDto extends createZodDto(UpdateTournamentSchema) {}