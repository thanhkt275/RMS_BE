import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Define team member schema
const TeamMemberSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).array().optional();

// Define the Zod schema for team creation
export const CreateTeamSchema = z.object({
  teamNumber: z.string().optional(), // Now optional as it will be auto-generated
  name: z.string().min(1, 'Team name is required'),
  organization: z.string().optional(),
  avatar: z.string().url('Avatar must be a valid URL').optional(),
  description: z.string().optional(),
  teamMembers: z.preprocess(
    (val) => typeof val === 'string' ? JSON.parse(val) : val,
    TeamMemberSchema
  ),
  tournamentId: z.string().uuid('Tournament ID must be a valid UUID').optional(),
});

// Create a DTO class from the Zod schema
export class CreateTeamDto extends createZodDto(CreateTeamSchema) {}