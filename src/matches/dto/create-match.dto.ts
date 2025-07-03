import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { MatchType, MatchState, AllianceColor } from '../../utils/prisma-types';

// Define the Alliance schema
const CreateAllianceSchema = z.object({
  color: z.nativeEnum(AllianceColor, { required_error: 'Alliance color is required' }),
  teamIds: z.array(z.string().uuid('Team ID must be a valid UUID')),
});

// Define the Zod schema for match creation
export const CreateMatchSchema = z.object({
  matchNumber: z.number().int().positive('Match number must be a positive integer'),
  status: z.nativeEnum(MatchState).default(MatchState.PENDING).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  stageId: z.string().uuid('Stage ID must be a valid UUID'),
  alliances: z.array(CreateAllianceSchema).optional(),
  matchType: z.nativeEnum(MatchType).optional(), // Add matchType as enum
}).refine(data => !data.startTime || !data.endTime || data.startTime <= data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

// Create DTO classes from the Zod schemas
export class CreateAllianceDto extends createZodDto(CreateAllianceSchema) {}
export class CreateMatchDto extends createZodDto(CreateMatchSchema) {}