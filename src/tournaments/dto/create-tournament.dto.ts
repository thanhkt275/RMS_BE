import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Define the Zod schema for tournament creation
export const CreateTournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required'),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  adminId: z.string().uuid('Admin ID must be a valid UUID'),
  numberOfFields: z.coerce.number().int().min(1).max(20).default(1),
  maxTeamMembers: z.coerce.number().int().optional().nullable(),
  maxTeams: z.coerce.number().int().optional().nullable(),
}).refine(data => data.startDate <= data.endDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Create a DTO class from the Zod schema
export class CreateTournamentDto extends createZodDto(CreateTournamentSchema) {}