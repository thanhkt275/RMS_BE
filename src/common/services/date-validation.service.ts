import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { 
  DateRange, 
  validateHierarchicalDateRange, 
  HierarchicalDateValidationOptions 
} from '../../users/dto/validation.utils';

export interface TournamentDateValidationContext {
  tournamentId: string;
  excludeStageId?: string; // For updates, exclude the stage being updated
  excludeMatchId?: string; // For updates, exclude the match being updated
}

export interface StageeDateValidationContext {
  stageId: string;
  tournamentId: string;
  excludeMatchId?: string; // For updates, exclude the match being updated
}

@Injectable()
export class DateValidationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validates tournament date range against existing stages
   */
  async validateTournamentDateRange(
    tournamentRange: DateRange,
    context: TournamentDateValidationContext
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Get existing stages for this tournament
    const existingStages = await this.prisma.stage.findMany({
      where: {
        tournamentId: context.tournamentId,
        ...(context.excludeStageId && { id: { not: context.excludeStageId } })
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      }
    });

    // Validate each existing stage falls within new tournament range
    for (const stage of existingStages) {
      const stageRange: DateRange = {
        startDate: stage.startDate,
        endDate: stage.endDate
      };

      const validation = validateHierarchicalDateRange(stageRange, {
        parentRange: tournamentRange
      });

      if (!validation.isValid) {
        errors.push(`Stage "${stage.name}" (${stage.startDate.toLocaleDateString()} - ${stage.endDate.toLocaleDateString()}) falls outside the new tournament date range`);
      }
    }

    // Get team registration data if applicable
    const teams = await this.prisma.team.findMany({
      where: { tournamentId: context.tournamentId },
      select: { createdAt: true, name: true }
    });

    // Check if any teams are registered outside the new tournament range
    for (const team of teams) {
      if (team.createdAt < tournamentRange.startDate || team.createdAt > tournamentRange.endDate) {
        errors.push(`Team "${team.name}" was registered outside the new tournament date range`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates stage date range against tournament and existing matches
   */
  async validateStageeDateRange(
    stageRange: DateRange,
    context: StageeDateValidationContext
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Get tournament date range
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: context.tournamentId },
      select: {
        startDate: true,
        endDate: true,
        name: true
      }
    });

    if (!tournament) {
      errors.push('Tournament not found');
      return { isValid: false, errors };
    }

    const tournamentRange: DateRange = {
      startDate: tournament.startDate,
      endDate: tournament.endDate
    };

    // Validate stage falls within tournament range
    const tournamentValidation = validateHierarchicalDateRange(stageRange, {
      parentRange: tournamentRange
    });

    if (!tournamentValidation.isValid) {
      errors.push(`Stage dates must fall within tournament dates (${tournament.startDate.toLocaleDateString()} - ${tournament.endDate.toLocaleDateString()})`);
    }

    // Get existing matches for this stage
    const existingMatches = await this.prisma.match.findMany({
      where: {
        stageId: context.stageId,
        ...(context.excludeMatchId && { id: { not: context.excludeMatchId } })
      },
      select: {
        id: true,
        matchNumber: true,
        startTime: true,
        endTime: true,
      }
    });

    // Validate each existing match falls within new stage range
    for (const match of existingMatches) {
      if (match.startTime && match.startTime < stageRange.startDate) {
        errors.push(`Match ${match.matchNumber} is scheduled before the new stage start date`);
      }
      if (match.endTime && match.endTime > stageRange.endDate) {
        errors.push(`Match ${match.matchNumber} is scheduled after the new stage end date`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates match scheduling against stage date range
   */
  async validateMatchDateRange(
    matchRange: DateRange,
    stageId: string,
    excludeMatchId?: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Get stage date range
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      select: {
        startDate: true,
        endDate: true,
        name: true,
        tournament: {
          select: {
            startDate: true,
            endDate: true,
            name: true
          }
        }
      }
    });

    if (!stage) {
      errors.push('Stage not found');
      return { isValid: false, errors };
    }

    const stageRange: DateRange = {
      startDate: stage.startDate,
      endDate: stage.endDate
    };

    // Validate match falls within stage range
    const stageValidation = validateHierarchicalDateRange(matchRange, {
      parentRange: stageRange
    });

    if (!stageValidation.isValid) {
      errors.push(`Match dates must fall within stage dates (${stage.startDate.toLocaleDateString()} - ${stage.endDate.toLocaleDateString()})`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates team registration timing against tournament dates
   */
  async validateTeamRegistrationTiming(
    registrationDate: Date,
    tournamentId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        startDate: true,
        endDate: true,
        name: true
      }
    });

    if (!tournament) {
      errors.push('Tournament not found');
      return { isValid: false, errors };
    }

    // Team registration should be before tournament end date
    // and ideally before tournament start date (but allow during tournament)
    if (registrationDate > tournament.endDate) {
      errors.push(`Team registration cannot be after tournament end date (${tournament.endDate.toLocaleDateString()})`);
    }

    // Warning if registering after tournament has started
    if (registrationDate > tournament.startDate) {
      // This is a warning, not an error - teams can register during tournament
      // but we'll track this for business logic
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets date boundary information for UI display
   */
  async getDateBoundaries(tournamentId: string, stageId?: string): Promise<{
    tournament: DateRange;
    stage?: DateRange;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        startDate: true,
        endDate: true,
        name: true
      }
    });

    if (!tournament) {
      throw new BadRequestException('Tournament not found');
    }

    const result: any = {
      tournament: {
        startDate: tournament.startDate,
        endDate: tournament.endDate
      },
      warnings
    };

    if (stageId) {
      const stage = await this.prisma.stage.findUnique({
        where: { id: stageId },
        select: {
          startDate: true,
          endDate: true,
          name: true
        }
      });

      if (stage) {
        result.stage = {
          startDate: stage.startDate,
          endDate: stage.endDate
        };
      }
    }

    // Add warnings for tight date ranges
    const now = new Date();
    if (tournament.startDate <= now) {
      warnings.push('Tournament has already started - date changes may affect ongoing activities');
    }

    return result;
  }

  /**
   * Validates if tournament dates can be safely updated
   */
  async canUpdateTournamentDates(
    tournamentId: string,
    newRange: DateRange
  ): Promise<{ canUpdate: boolean; blockers: string[]; warnings: string[] }> {
    const blockers: string[] = [];
    const warnings: string[] = [];

    // Check for active matches
    const activeMatches = await this.prisma.match.findMany({
      where: {
        stage: { tournamentId },
        status: { in: ['IN_PROGRESS'] }
      },
      select: {
        matchNumber: true,
        startTime: true,
        stage: { select: { name: true } }
      }
    });

    if (activeMatches.length > 0) {
      blockers.push(`Cannot update dates: ${activeMatches.length} matches are currently active`);
    }

    // Check for completed matches outside new range
    const completedMatches = await this.prisma.match.findMany({
      where: {
        stage: { tournamentId },
        status: 'COMPLETED',
        OR: [
          { startTime: { lt: newRange.startDate } },
          { endTime: { gt: newRange.endDate } }
        ]
      },
      select: {
        matchNumber: true,
        startTime: true,
        stage: { select: { name: true } }
      }
    });

    if (completedMatches.length > 0) {
      blockers.push(`Cannot update dates: ${completedMatches.length} completed matches fall outside the new date range`);
    }

    return {
      canUpdate: blockers.length === 0,
      blockers,
      warnings
    };
  }
}
