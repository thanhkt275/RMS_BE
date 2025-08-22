import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { MatchType, MatchState, AllianceColor } from '../../utils/prisma-types';
import { validateHierarchicalDateRange } from '../../users/dto/validation.utils';

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
  fieldId: z.string().uuid('Field ID must be a valid UUID').optional(),
  alliances: z.array(CreateAllianceSchema).optional(),
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
export class CreateAllianceDto extends createZodDto(CreateAllianceSchema) {}
export class CreateMatchDto extends createZodDto(CreateMatchSchema) {}