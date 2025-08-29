import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Gender } from '../../../generated/prisma';

export const CreateTeamMemberSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  gender: z
    .nativeEnum(Gender, {
      errorMap: () => ({ message: 'Invalid gender' }),
    })
    .nullable()
    .optional(),
  phoneNumber: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((val) => !val || /\S+@\S+\.\S+/.test(val), {
      message: 'Invalid email format',
    }),
  province: z.string().min(1),
  ward: z.string().min(1),
  organization: z.string().optional(),
  organizationAddress: z.string().optional(),
  teamId: z.string().uuid('Team ID must be a valid UUID').optional(),
});

export const CreateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  userId: z.string().uuid('User ID must be a valid UUID').optional(),
  tournamentId: z.string().uuid('Tournament ID must be a valid UUID'),
  referralSource: z.string(),
  teamMembers: z.array(CreateTeamMemberSchema),
});

export class CreateTeamDto extends createZodDto(CreateTeamSchema) {}
export class CreateTeamMemberDto extends createZodDto(CreateTeamMemberSchema) {}
