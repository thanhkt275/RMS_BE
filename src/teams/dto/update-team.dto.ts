import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CreateTeamSchema } from './create-team.dto';

// Define the Zod schema for team updates - making all fields optional
export const UpdateTeamSchema = CreateTeamSchema.partial();

// Create a DTO class from the Zod schema
export class UpdateTeamDto extends createZodDto(UpdateTeamSchema) {}