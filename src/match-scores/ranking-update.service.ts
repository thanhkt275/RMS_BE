import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TeamStatsApiService } from './team-stats-api.service';

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
  tiebreaker1: number;
  tiebreaker2: number;
  rank: number;
}

export interface RankingUpdateEvent {
  type: 'ranking_update';
  tournamentId: string;
  stageId?: string;
  rankings: TeamRanking[];
  timestamp: number;
  triggerMatchId?: string;
  updateType: 'full' | 'incremental';
}

export interface RankingRecalculationEvent {
  type: 'ranking_recalculation_started' | 'ranking_recalculation_completed' | 'ranking_recalculation_failed';
  tournamentId: string;
  stageId?: string;
  timestamp: number;
  progress?: number;
  error?: string;
}

/**
 * Service responsible for triggering ranking updates and emitting WebSocket events
 * when match scores change. This service acts as a bridge between score submission
 * and real-time ranking updates.
 */
// Global reference to EventsGateway (will be set by the gateway itself)
let globalEventsGateway: any = null;

export function setGlobalEventsGateway(gateway: any) {
  globalEventsGateway = gateway;
}

@Injectable()
export class RankingUpdateService {
  private readonly logger = new Logger(RankingUpdateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teamStatsApiService: TeamStatsApiService
  ) {}

  /**
   * Triggers ranking update after score changes
   * This is the main method called from score submission endpoints
   */
  async triggerRankingUpdate(
    tournamentId: string,
    stageId?: string,
    matchId?: string
  ): Promise<void> {
    const context = {
      tournamentId,
      stageId,
      matchId,
      timestamp: new Date().toISOString()
    };

    try {
      this.logger.log(`🚀 Starting ranking update`, context);

      // Validate inputs
      if (!tournamentId) {
        throw new Error('Tournament ID is required for ranking update');
      }

      // Emit recalculation started event
      this.emitRecalculationEvent('ranking_recalculation_started', tournamentId, stageId);

      // Recalculate rankings using existing service
      this.logger.debug(`📊 Recalculating rankings for tournament ${tournamentId}`, context);
      await this.teamStatsApiService.calculateAndWriteRankings(tournamentId, stageId);

      // Get updated rankings
      this.logger.debug(`📋 Fetching updated rankings for broadcast`, context);
      const rankings = await this.getRankingsForBroadcast(tournamentId, stageId);

      // Emit ranking update event
      const rankingEvent: RankingUpdateEvent = {
        type: 'ranking_update',
        tournamentId,
        stageId,
        rankings,
        timestamp: Date.now(),
        triggerMatchId: matchId,
        updateType: 'incremental'
      };

      this.logger.debug(`📡 Broadcasting ranking update to ${rankings.length} teams`, context);
      this.emitRankingUpdate(rankingEvent);

      // Emit recalculation completed event
      this.emitRecalculationEvent('ranking_recalculation_completed', tournamentId, stageId);

      this.logger.log(`✅ Rankings updated successfully for tournament ${tournamentId} (${rankings.length} teams)`, context);
    } catch (error) {
      const errorContext = { ...context, error: error.message, stack: error.stack };

      // Categorize error types for better debugging
      if (error.message?.includes('Tournament ID is required')) {
        this.logger.error(`❌ Validation Error: ${error.message}`, errorContext);
      } else if (error.message?.includes('not found')) {
        this.logger.error(`❌ Data Not Found Error: ${error.message}`, errorContext);
      } else if (error.message?.includes('database') || error.message?.includes('prisma')) {
        this.logger.error(`❌ Database Error during ranking update: ${error.message}`, errorContext);
      } else if (error.message?.includes('WebSocket') || error.message?.includes('emit')) {
        this.logger.error(`❌ WebSocket Error during ranking broadcast: ${error.message}`, errorContext);
      } else {
        this.logger.error(`❌ Unexpected Error during ranking update: ${error.message}`, errorContext);
      }

      // Emit recalculation failed event with detailed error info
      this.emitRecalculationEvent(
        'ranking_recalculation_failed',
        tournamentId,
        stageId,
        error.message
      );

      // Don't throw - ranking update failure shouldn't break score submission
      this.logger.warn(`⚠️ Ranking update failed but continuing with score submission`, errorContext);
    }
  }

  /**
   * Gets current rankings formatted for WebSocket broadcast
   */
  private async getRankingsForBroadcast(
    tournamentId: string,
    stageId?: string
  ): Promise<TeamRanking[]> {
    try {
      // Build filter dynamically to avoid assigning unknown properties on a typed DTO literal
      const filter: any = {};
      if (stageId) {
        filter.stageId = stageId;
      }
      const stats = await this.teamStatsApiService.getStatsForTournament(tournamentId, Object.keys(filter).length ? filter : undefined);

      if (!stats || stats.length === 0) {
        this.logger.warn(`⚠️ No team stats found for tournament ${tournamentId}${stageId ? `, stage ${stageId}` : ''}`);
        return [];
      }

      const rankings = stats.map(stat => ({
        teamId: stat.teamId,
        teamNumber: stat.teamNumber,
        teamName: stat.teamName,
        wins: stat.wins,
        losses: stat.losses,
        ties: stat.ties,
        pointsScored: stat.pointsScored,
        pointsConceded: stat.pointsConceded,
        pointDifferential: stat.pointDifferential,
        rankingPoints: stat.rankingPoints,
        tiebreaker1: stat.tiebreaker1,
        tiebreaker2: stat.tiebreaker2,
        rank: stat.rank ?? 0
      }));

      this.logger.debug(`📊 Retrieved ${rankings.length} team rankings for broadcast`);
      return rankings;
    } catch (error) {
      this.logger.error(`❌ Failed to get rankings for broadcast (tournament: ${tournamentId}, stage: ${stageId}):`, error);
      throw new Error(`Failed to retrieve rankings: ${error.message}`);
    }
  }

  /**
   * Emits ranking update event to tournament room
   */
  private emitRankingUpdate(event: RankingUpdateEvent): void {
    try {
      if (!globalEventsGateway?.server) {
        this.logger.warn('⚠️ EventsGateway not available, skipping ranking update broadcast');
        return;
      }

      const roomName = `tournament_${event.tournamentId}`;
      const clientCount = globalEventsGateway.server.sockets.adapter.rooms.get(roomName)?.size || 0;

      globalEventsGateway.server.to(roomName).emit('ranking_update', event);

      this.logger.log(`📡 Emitted ranking_update to room ${roomName} (${clientCount} clients) with ${event.rankings.length} teams`);
    } catch (error) {
      this.logger.error(`❌ Failed to emit ranking update event:`, error);
      // Don't throw - WebSocket emission failure shouldn't break the ranking update process
    }
  }

  /**
   * Emits ranking recalculation status events
   */
  private emitRecalculationEvent(
    type: RankingRecalculationEvent['type'],
    tournamentId: string,
    stageId?: string,
    error?: string
  ): void {
    try {
      if (!globalEventsGateway?.server) {
        this.logger.warn('⚠️ EventsGateway not available, skipping recalculation event broadcast');
        return;
      }

      const event: RankingRecalculationEvent = {
        type,
        tournamentId,
        stageId,
        timestamp: Date.now(),
        error
      };

      const roomName = `tournament_${tournamentId}`;
      const clientCount = globalEventsGateway.server.sockets.adapter.rooms.get(roomName)?.size || 0;

      globalEventsGateway.server.to(roomName).emit(type, event);

      const emoji = type.includes('started') ? '🔄' : type.includes('completed') ? '✅' : '❌';
      this.logger.log(`${emoji} Emitted ${type} to room ${roomName} (${clientCount} clients)`);
    } catch (error) {
      this.logger.error(`❌ Failed to emit recalculation event (${type}):`, error);
      // Don't throw - WebSocket emission failure shouldn't break the ranking update process
    }
  }

  /**
   * Force recalculation of rankings (for manual triggers)
   */
  async forceRecalculation(tournamentId: string, stageId?: string): Promise<TeamRanking[]> {
    await this.triggerRankingUpdate(tournamentId, stageId);
    return this.getRankingsForBroadcast(tournamentId, stageId);
  }

  /**
   * Get live rankings without triggering recalculation
   */
  async getLiveRankings(tournamentId: string, stageId?: string): Promise<TeamRanking[]> {
    this.logger.debug(`📊 Getting live rankings for tournament ${tournamentId}${stageId ? `, stage ${stageId}` : ''}`);
    return this.getRankingsForBroadcast(tournamentId, stageId);
  }

  /**
   * Check if a tournament has any rankings data
   */
  async hasRankingsData(tournamentId: string, stageId?: string): Promise<boolean> {
    try {
      const rankings = await this.getRankingsForBroadcast(tournamentId, stageId);
      return rankings.length > 0;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to check rankings data for tournament ${tournamentId}:`, error);
      return false;
    }
  }

  /**
   * Get ranking statistics for a tournament
   */
  async getRankingStats(tournamentId: string, stageId?: string): Promise<{
    totalTeams: number;
    teamsWithMatches: number;
    lastUpdated: Date | null;
    averageRankingPoints: number;
  }> {
    try {
      const rankings = await this.getRankingsForBroadcast(tournamentId, stageId);
      const teamsWithMatches = rankings.filter(r => r.wins + r.losses + r.ties > 0).length;
      const totalRankingPoints = rankings.reduce((sum, r) => sum + r.rankingPoints, 0);
      const averageRankingPoints = rankings.length > 0 ? totalRankingPoints / rankings.length : 0;

      return {
        totalTeams: rankings.length,
        teamsWithMatches,
        lastUpdated: new Date(), // Could be enhanced to track actual last update time
        averageRankingPoints
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get ranking stats for tournament ${tournamentId}:`, error);
      throw error;
    }
  }
}
