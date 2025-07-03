import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { StageType } from '../../utils/prisma-types';

/**
 * Schema for advancing teams to the next stage
 */
export const AdvanceTeamsSchema = z.object({
  teamsToAdvance: z
    .number()
    .int()
    .min(1, 'Number of teams to advance must be at least 1')
    .max(100, 'Cannot advance more than 100 teams at once'),
    
  nextStageId: z
    .string()
    .uuid('Next stage ID must be a valid UUID')
    .optional(),
    
  createNextStage: z
    .boolean()
    .optional()
    .default(false),
    
  nextStageConfig: z
    .object({
      name: z
        .string()
        .min(1, 'Stage name is required')
        .max(100, 'Stage name must be less than 100 characters'),
        
      type: z.nativeEnum(StageType, {
        errorMap: () => ({ message: 'Invalid stage type' }),
      }),
      
      startDate: z.coerce.date(),
      
      endDate: z.coerce.date(),
      
      teamsPerAlliance: z
        .number()
        .int()
        .min(1, 'Teams per alliance must be at least 1')
        .max(10, 'Teams per alliance cannot exceed 10')
        .optional()
        .default(2),
    })
    .refine(data => data.startDate <= data.endDate, {
      message: 'End date must be after start date',
      path: ['endDate'],
    })
    .optional(),
}).refine(
  data => {
    // If createNextStage is true, nextStageConfig is required
    if (data.createNextStage && !data.nextStageConfig) {
      return false;
    }
    // Cannot specify both nextStageId and createNextStage
    if (data.nextStageId && data.createNextStage) {
      return false;
    }
    return true;
  },
  {
    message: 'Either provide nextStageId OR set createNextStage=true with nextStageConfig',
    path: ['nextStageId'],
  }
);

/**
 * DTO for advancing teams to the next stage
 */
export class AdvanceTeamsDto extends createZodDto(AdvanceTeamsSchema) {}

/**
 * Schema for stage advancement response
 */
export const StageAdvancementResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    advancedTeams: z.array(
      z.object({
        id: z.string(),
        teamNumber: z.string(),
        name: z.string(),
        currentStageId: z.string().nullable(),
      })
    ),
    completedStage: z.object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
    }),
    nextStage: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
      })
      .optional(),
    totalTeamsAdvanced: z.number(),
  }),
});

/**
 * Schema for team ranking response
 */
export const TeamRankingResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(
    z.object({
      teamId: z.string(),
      teamNumber: z.string(),
      teamName: z.string(),
      wins: z.number(),
      losses: z.number(),
      ties: z.number(),
      pointsScored: z.number(),
      pointsConceded: z.number(),
      pointDifferential: z.number(),
      rankingPoints: z.number(),
      tiebreaker1: z.number(),
      tiebreaker2: z.number(),
      rank: z.number().optional(),
    })
  ),
});

/**
 * Schema for stage readiness response
 */
export const StageReadinessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    ready: z.boolean(),
    reason: z.string().optional(),
    incompleteMatches: z.number().optional(),
    totalTeams: z.number().optional(),
  }),
});
