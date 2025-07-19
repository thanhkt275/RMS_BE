import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CreateTeamSchema, CreateTeamMemberSchema } from './create-team.dto';

const UpdateTeamMemberSchema = CreateTeamMemberSchema.extend({
  id: z.string().uuid('Team member ID must be a valid UUID'),
}).partial();

export const UpdateTeamSchema = CreateTeamSchema.omit({
  tournamentId: true,
  userId: true,
})
  .extend({
    teamMembers: z.array(UpdateTeamMemberSchema),
    userId: z.string().uuid('User ID must be a valid UUID'),
  })
  .partial()
  .extend({
    id: z.string().uuid('Team ID must be a valid UUID'),
  });
export class UpdateTeamDto extends createZodDto(UpdateTeamSchema) {}
