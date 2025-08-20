import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Gender } from '../../../generated/prisma';

export const CreateTeamMemberSchema = z.object({
  name: z.string().min(11),
  gender: z
    .nativeEnum(Gender, {
      errorMap: () => ({ message: 'Invalid gender' }),
    })
    .nullable()
    .optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().or(z.literal('')).optional(),
  province: z.string().min(1),
  ward: z.string().min(1),
  organization: z.string().optional(),
  organizationAddress: z.string().optional(),
  teamId: z.string().uuid('Team ID must be a valid UUID').optional(),
  dateOfBirth: z
    .string()
    .refine((val) => {
      const dob = new Date(val);
      if (isNaN(dob.getTime())) return false;

      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const hasHadBirthdayThisYear =
        today.getMonth() > dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

      if (!hasHadBirthdayThisYear) {
        age -= 1;
      }

      return age >= 10 && age <= 18;
    }, {
      message: "Age must be between 10 and 18 years",
    }),
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
