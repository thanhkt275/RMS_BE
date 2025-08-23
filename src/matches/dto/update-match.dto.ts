import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CardType, MatchType, MatchState } from '../../utils/prisma-types';
import { validateHierarchicalDateRange } from '../../users/dto/validation.utils';

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
  endTime: z.coerce.date().optional(),
  fieldId: z.string().uuid('Field ID must be a valid UUID').optional(),
  scoredById: z.string().uuid('Scorer ID must be a valid UUID').optional(),
  matchType: z.nativeEnum(MatchType).optional(),
}).refine(data => {
  // Only validate if both times are provided
  if (data.startTime && data.endTime) {
    const validation = validateHierarchicalDateRange(
      { startDate: data.startTime, endDate: data.endTime },
      {
        minDuration: 0.1, // 6 minutes minimum
        maxDuration: 4 // 4 hours maximum
      }
    );
    return validation.isValid;
  }
  return true;
}, {
  message: 'Invalid match duration - must be between 6 minutes and 4 hours',
  path: ['endTime'],
}).refine(data => {
  // Match should not be scheduled more than 1 year in the future
  if (data.startTime) {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return data.startTime <= oneYearFromNow;
  }
  return true;
}, {
  message: 'Match cannot be scheduled more than 1 year in the future',
  path: ['startTime'],
});

// Create DTO classes from the Zod schemas
export class UpdateAllianceDto extends createZodDto(UpdateAllianceSchema) {}
export class UpdateAllianceScoringDto extends createZodDto(UpdateAllianceScoringSchema) {}
export class UpdateMatchDto extends createZodDto(UpdateMatchSchema) {}