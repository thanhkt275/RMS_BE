import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CardType, MatchType, MatchState } from '../../utils/prisma-types';

// Define the Alliance update schema
export const UpdateAllianceSchema = z.object({
  score: z.number().int().min(0, 'Score must be a non-negative integer').optional(),
  color: z.string().optional(),
});

// Define the Alliance Scoring update schema
export const UpdateAllianceScoringSchema = z.object({
  scoreDetails: z.any().optional(), // JSON object for detailed scoring
  card: z.nativeEnum(CardType).optional(),
  notes: z.string().optional(),
});

// Define the Match update schema - making all fields optional
export const UpdateMatchSchema = z.object({
  matchNumber: z.number().int().positive().optional(),
  status: z.nativeEnum(MatchState).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),  fieldId: z.string().uuid('Field ID must be a valid UUID').optional(),
  scoredById: z.string().uuid('Scorer ID must be a valid UUID').optional(),
  matchType: z.nativeEnum(MatchType).optional(), // Add matchType as enum
}).refine(data => !data.startTime || !data.endTime || data.startTime <= data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

// Create DTO classes from the Zod schemas
export class UpdateAllianceDto extends createZodDto(UpdateAllianceSchema) {}
export class UpdateAllianceScoringDto extends createZodDto(UpdateAllianceScoringSchema) {}
export class UpdateMatchDto extends createZodDto(UpdateMatchSchema) {}