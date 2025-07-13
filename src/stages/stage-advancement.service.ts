import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StageStatus, MatchState, Stage, Team } from '../utils/prisma-types';

/**
 * Interface defining the result of a stage advancement operation
 */
export interface StageAdvancementResult {
  advancedTeams: Team[];
  completedStage: Stage;
  nextStage?: Stage;
  totalTeamsAdvanced: number;
}

/**
 * Interface for team ranking data used in advancement
 */
export interface TeamRanking {
  teamId: string;
  teamNumber: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsScored: number;
  pointsConceded: number;
  pointDifferential: number;
  rankingPoints: number;
  rank?: number;
  opponentWinPercentage?: number;
  matchesPlayed?: number;
}

/**
 * Configuration options for stage advancement
 */
export interface AdvancementOptions {
  /** Number of teams to advance to the next stage */
  teamsToAdvance: number;
  /** Optional: Specific next stage ID to advance teams to */
  nextStageId?: string;
  /** Whether to automatically create the next stage if it doesn't exist */
  createNextStage?: boolean;
  /** Next stage configuration if creating automatically */
  nextStageConfig?: {
    name: string;
    type: 'SWISS' | 'PLAYOFF' | 'FINAL';
    startDate: Date;
    endDate: Date;
    teamsPerAlliance?: number;
  };
}

/**
 * Service responsible for handling stage advancement logic.
 * Implements SOLID principles with single responsibility for stage transitions.
 */
@Injectable()
export class StageAdvancementService {
  private readonly logger = new Logger(StageAdvancementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Advances teams from one stage to the next based on rankings.
   * This is the main entry point for stage advancement.
   * 
   * @param stageId - ID of the stage to complete and advance teams from
   * @param options - Configuration for the advancement process
   * @returns Promise<StageAdvancementResult> - Results of the advancement operation
   * @throws BadRequestException if stage cannot be advanced
   * @throws NotFoundException if stage is not found
   */
  async advanceTeamsToNextStage(
    stageId: string, 
    options: AdvancementOptions
  ): Promise<StageAdvancementResult> {
    this.logger.log(`Starting stage advancement for stage ${stageId}`);

    // Step 1: Validate stage and check if advancement is possible
    const stage = await this.validateStageForAdvancement(stageId);
    
    // Step 2: Verify all matches are completed
    await this.ensureAllMatchesCompleted(stageId);
    
    // Step 3: Check if teams are available (either assigned to stage or in tournament)
    let availableTeams: any[] = [];
    if (stage.teams.length === 0) {
      // For first stage, get teams from tournament
      availableTeams = await this.prisma.team.findMany({
        where: { tournamentId: stage.tournamentId }
      });
      
      if (availableTeams.length === 0) {
        throw new BadRequestException(`Stage "${stage.name}" has no teams available. Teams must be added to the tournament before advancement.`);
      }
    } else {
      availableTeams = stage.teams;
    }
    
    // Step 4: Get team rankings for advancement
    const teamRankings = await this.getTeamRankingsForStage(stageId);
    
    // Step 5: Validate advancement parameters
    this.validateAdvancementOptions(teamRankings.length, options);
    
    // Step 6: Select top teams for advancement
    const topTeams = this.selectTopTeams(teamRankings, options.teamsToAdvance);
    
    // Step 7: Handle next stage (find existing or create new)
    const nextStage = await this.resolveNextStage(stage, options);
    
    // Step 8: Execute advancement in transaction
    const result = await this.executeAdvancement(stage, topTeams, nextStage);
    
    this.logger.log(`Successfully advanced ${result.totalTeamsAdvanced} teams from stage ${stageId}`);
    
    return result;
  }
  /**
   * Validates that a stage exists and can be advanced.
   * A stage can be advanced if it's currently ACTIVE.
   */
  private async validateStageForAdvancement(stageId: string): Promise<Stage & { teams: Team[] }> {
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      include: {
        tournament: true,
        matches: true,
        teams: true
      }
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${stageId} not found`);
    }

    if (stage.status === StageStatus.COMPLETED) {
      throw new BadRequestException(`Stage "${stage.name}" has already been completed`);
    }

    // Don't require teams to be assigned to the stage for readiness check
    // Teams are only assigned when they advance from a previous stage
    // The readiness check should only verify that all matches are completed

    return stage;
  }

  /**
   * Ensures all matches in the stage are completed.
   * Throws an exception if any matches are still pending or in progress.
   */
  private async ensureAllMatchesCompleted(stageId: string): Promise<void> {
    const incompleteMatches = await this.prisma.match.findMany({
      where: {
        stageId,
        status: {
          in: [MatchState.PENDING, MatchState.IN_PROGRESS]
        }
      },
      select: {
        id: true,
        matchNumber: true,
        status: true
      }
    });

    if (incompleteMatches.length > 0) {
      const matchNumbers = incompleteMatches.map(m => m.matchNumber).join(', ');
      throw new BadRequestException(
        `Cannot advance stage: ${incompleteMatches.length} matches are still incomplete (matches: ${matchNumbers})`
      );
    }
  }

  /**
   * Retrieves team rankings for a specific stage.
   * Uses TeamStats to get performance metrics and calculates final rankings.
   */
  private async getTeamRankingsForStage(stageId: string): Promise<TeamRanking[]> {
    // First, try to get team stats for this specific stage
    let teamStats = await this.prisma.teamStats.findMany({
      where: { stageId },
      include: {
        team: true
      },
      orderBy: [
        { rankingPoints: 'desc' },
        { opponentWinPercentage: 'desc' },
        { pointDifferential: 'desc' },
        { matchesPlayed: 'desc' }
      ]
    });

    // If no team stats found for this stage, try to get stats from tournament
    if (teamStats.length === 0) {
      const stage = await this.prisma.stage.findUnique({
        where: { id: stageId },
        select: { tournamentId: true }
      });
      
      if (stage) {
        teamStats = await this.prisma.teamStats.findMany({
          where: { 
            tournamentId: stage.tournamentId,
            stageId: null // Get stats that are not stage-specific
          },
          include: {
            team: true
          },
          orderBy: [
            { rankingPoints: 'desc' },
            { opponentWinPercentage: 'desc' },
            { pointDifferential: 'desc' },
            { matchesPlayed: 'desc' }
          ]
        });
      }
    }

    if (teamStats.length === 0) {
      throw new BadRequestException('No team statistics found for this stage or tournament');
    }

    // Calculate OWP for each team using losses/total matches
    const teamOWP = new Map<string, number>();
    for (const stat of teamStats) {
      const totalMatches = stat.wins + stat.losses + stat.ties;
      const owp = totalMatches > 0 ? stat.losses / totalMatches : 0;
      teamOWP.set(stat.teamId, owp);
    }

    // Convert to ranking format and assign ranks
    return teamStats.map((stat, index) => ({
      teamId: stat.teamId,
      teamNumber: stat.team.teamNumber,
      teamName: stat.team.name,
      wins: stat.wins,
      losses: stat.losses,
      ties: stat.ties,
      pointsScored: stat.pointsScored,
      pointsConceded: stat.pointsConceded,
      pointDifferential: stat.pointDifferential,
      rankingPoints: stat.rankingPoints,
      rank: index + 1,
      opponentWinPercentage: teamOWP.get(stat.teamId) ?? 0,
      matchesPlayed: stat.matchesPlayed ?? (stat.wins + stat.losses + stat.ties)
    }));
  }

  /**
   * Validates advancement options against available teams.
   */
  private validateAdvancementOptions(totalTeams: number, options: AdvancementOptions): void {
    if (options.teamsToAdvance <= 0) {
      throw new BadRequestException('Number of teams to advance must be greater than 0');
    }

    if (options.teamsToAdvance > totalTeams) {
      throw new BadRequestException(
        `Cannot advance ${options.teamsToAdvance} teams when only ${totalTeams} teams participated in the stage`
      );
    }

    // Validate next stage configuration if creating new stage
    if (options.createNextStage && !options.nextStageConfig) {
      throw new BadRequestException('Next stage configuration is required when createNextStage is true');
    }
  }

  /**
   * Selects the top N teams based on their rankings.
   */
  private selectTopTeams(rankings: TeamRanking[], count: number): TeamRanking[] {
    return rankings.slice(0, count);
  }

  /**
   * Resolves the next stage for advancement.
   * Either finds an existing stage or creates a new one based on options.
   */
  private async resolveNextStage(currentStage: Stage, options: AdvancementOptions): Promise<Stage | null> {
    // If specific next stage ID is provided, use it
    if (options.nextStageId) {
      const nextStage = await this.prisma.stage.findUnique({
        where: { id: options.nextStageId }
      });
      
      if (!nextStage) {
        throw new NotFoundException(`Next stage with ID ${options.nextStageId} not found`);
      }
      
      return nextStage;
    }

    // If creating next stage automatically
    if (options.createNextStage && options.nextStageConfig) {
      return await this.createNextStage(currentStage.tournamentId, options.nextStageConfig);
    }

    // Look for an existing next stage in the same tournament
    const existingNextStage = await this.findNextStageInTournament(currentStage);
    
    return existingNextStage;
  }

  /**
   * Creates a new stage for team advancement.
   */
  private async createNextStage(tournamentId: string, config: NonNullable<AdvancementOptions['nextStageConfig']>): Promise<Stage> {
    return await this.prisma.stage.create({
      data: {
        name: config.name,
        type: config.type,
        status: StageStatus.ACTIVE,
        startDate: config.startDate,
        endDate: config.endDate,
        tournamentId,
        teamsPerAlliance: config.teamsPerAlliance || 2
      }
    });
  }  /**
   * Finds the next logical stage in a tournament.
   * This is a simple implementation that could be enhanced with more complex logic.
   */
  private async findNextStageInTournament(currentStage: Stage): Promise<Stage | null> {
    // Find stages in the same tournament that start after current stage ends
    const nextStages = await this.prisma.stage.findMany({
      where: {
        tournamentId: currentStage.tournamentId,
        startDate: { gte: currentStage.endDate },
        status: StageStatus.ACTIVE
      },
      orderBy: { startDate: 'asc' },
      take: 1
    });

    return nextStages[0] || null;
  }  /**
   * Executes the advancement process in a database transaction.
   * This ensures data consistency during the advancement operation.
   */
  private async executeAdvancement(
    currentStage: Stage, 
    topTeams: TeamRanking[], 
    nextStage: Stage | null
  ): Promise<StageAdvancementResult> {
    return await this.prisma.$transaction(async (tx) => {
      // Step 1: Mark current stage as completed
      const completedStage = await tx.stage.update({
        where: { id: currentStage.id },
        data: { status: StageStatus.COMPLETED }
      });

      // Step 2: Update teams' current stage if next stage exists
      let advancedTeams: Team[] = [];
      
      if (nextStage) {
        const teamIds = topTeams.map(t => t.teamId);
        
        // Update teams to point to the next stage
        await tx.team.updateMany({
          where: { id: { in: teamIds } },
          data: { currentStageId: nextStage.id }
        });

        // Fetch the updated teams
        advancedTeams = await tx.team.findMany({
          where: { id: { in: teamIds } }
        });

        this.logger.log(`Advanced ${advancedTeams.length} teams to stage "${nextStage.name}"`);
      } else {
        this.logger.log(`Completed stage "${currentStage.name}" without advancing teams to a next stage`);
      }

      return {
        advancedTeams,
        completedStage,
        nextStage: nextStage || undefined,
        totalTeamsAdvanced: topTeams.length
      };
    });
  }

  /**
   * Gets the current rankings for a stage without advancing teams.
   * Useful for preview purposes before actual advancement.
   */
  async getStageRankings(stageId: string): Promise<TeamRanking[]> {
    await this.validateStageForAdvancement(stageId);
    return await this.getTeamRankingsForStage(stageId);
  }

  /**
   * Checks if a stage is ready for advancement.
   * Returns information about the stage's advancement readiness.
   */
  async isStageReadyForAdvancement(stageId: string): Promise<{
    ready: boolean;
    reason?: string;
    incompleteMatches?: number;
    totalTeams?: number;
  }> {
    try {
      const stage = await this.validateStageForAdvancement(stageId);
      await this.ensureAllMatchesCompleted(stageId);
      
      // For the first stage, check if there are teams in the tournament
      // For subsequent stages, check if teams are assigned to this stage
      let teams: any[] = [];
      let totalTeams = 0;
      
      if (stage.teams.length === 0) {
        // Check if this is the first stage by looking for teams in the tournament
        const tournamentTeams = await this.prisma.team.findMany({
          where: { tournamentId: stage.tournamentId }
        });
        
        if (tournamentTeams.length === 0) {
          return {
            ready: false,
            reason: "No teams found in this tournament. Teams must be added to the tournament before advancement.",
            totalTeams: 0
          };
        }
        
        teams = tournamentTeams;
        totalTeams = tournamentTeams.length;
      } else {
        teams = stage.teams;
        totalTeams = stage.teams.length;
      }
      
      return {
        ready: true,
        totalTeams: totalTeams
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        // Check if it's due to incomplete matches
        const incompleteMatches = await this.prisma.match.count({
          where: {
            stageId,
            status: { in: [MatchState.PENDING, MatchState.IN_PROGRESS] }
          }
        });

        return {
          ready: false,
          reason: error.message,
          incompleteMatches: incompleteMatches > 0 ? incompleteMatches : undefined
        };
      }
      
      return {
        ready: false,
        reason: error.message
      };
    }
  }
}
