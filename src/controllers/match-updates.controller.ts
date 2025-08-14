/**
 * Match Updates Controller
 * 
 * REST API endpoints for detecting recent match updates and changes
 * that affect ranking calculations. Used by the polling-based ranking system.
 */

import { Controller, Get, Post, Query, Body, Logger } from '@nestjs/common';
import { MatchChangeDetectionService } from '../matches/match-change-detection.service';

export interface RecentUpdatesQuery {
  tournamentId: string;
  stageId?: string;
  since?: string;
  limit?: string;
}

export interface ActivityStatsResponse {
  totalChanges: number;
  recentCompletions: number;
  lastChangeTime: string | null;
  affectedTeamsCount: number;
  hasRecentActivity: boolean;
}

export interface ForceRecalculationRequest {
  tournamentId: string;
  stageId?: string;
}

@Controller('matches')
export class MatchUpdatesController {
  private readonly logger = new Logger(MatchUpdatesController.name);

  constructor(
    private readonly matchChangeDetectionService: MatchChangeDetectionService
  ) {}

  /**
   * Get recent match updates for polling-based ranking system
   * GET /matches/recent-updates?tournamentId=xxx&stageId=xxx&since=timestamp&limit=50
   */
  @Get('recent-updates')
  async getRecentUpdates(@Query() query: RecentUpdatesQuery) {
    try {
      const { tournamentId, stageId, since, limit = '50' } = query;

      if (!tournamentId) {
        return {
          success: false,
          error: 'tournamentId is required',
          data: [],
        };
      }

      const sinceTimestamp = since ? parseInt(since, 10) : undefined;
      const limitNumber = parseInt(limit, 10);

      const updates = await this.matchChangeDetectionService.getRecentMatchUpdates(
        tournamentId,
        stageId,
        sinceTimestamp,
        limitNumber
      );

      this.logger.debug(
        `Retrieved ${updates.length} recent match updates for tournament ${tournamentId}` +
        (stageId ? `, stage ${stageId}` : '') +
        (sinceTimestamp ? `, since ${new Date(sinceTimestamp).toISOString()}` : '')
      );

      return {
        success: true,
        data: updates,
        meta: {
          count: updates.length,
          tournamentId,
          stageId,
          since: sinceTimestamp ? new Date(sinceTimestamp).toISOString() : null,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Error retrieving recent match updates:', error);
      return {
        success: false,
        error: 'Failed to retrieve recent match updates',
        data: [],
      };
    }
  }

  /**
   * Get activity statistics for a tournament/stage
   * GET /matches/activity-stats?tournamentId=xxx&stageId=xxx
   */
  @Get('activity-stats')
  async getActivityStats(@Query() query: { tournamentId: string; stageId?: string }) {
    try {
      const { tournamentId, stageId } = query;

      if (!tournamentId) {
        return {
          success: false,
          error: 'tournamentId is required',
          data: null,
        };
      }

      const stats = this.matchChangeDetectionService.getActivityStats(tournamentId, stageId);

      const response: ActivityStatsResponse = {
        totalChanges: stats.totalChanges,
        recentCompletions: stats.recentCompletions,
        lastChangeTime: stats.lastChangeTime?.toISOString() || null,
        affectedTeamsCount: stats.affectedTeams.size,
        hasRecentActivity: stats.recentCompletions > 0,
      };

      return {
        success: true,
        data: response,
        meta: {
          tournamentId,
          stageId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Error retrieving activity stats:', error);
      return {
        success: false,
        error: 'Failed to retrieve activity stats',
        data: null,
      };
    }
  }

  /**
   * Check if there have been recent ranking-affecting changes
   * GET /matches/has-ranking-changes?tournamentId=xxx&stageId=xxx&since=timestamp
   */
  @Get('has-ranking-changes')
  async hasRankingChanges(@Query() query: { tournamentId: string; stageId?: string; since?: string }) {
    try {
      const { tournamentId, stageId, since } = query;

      if (!tournamentId) {
        return {
          success: false,
          error: 'tournamentId is required',
          data: { hasChanges: false },
        };
      }

      const sinceTimestamp = since ? parseInt(since, 10) : Date.now() - 5 * 60 * 1000;
      const sinceDate = new Date(sinceTimestamp);
      
      const hasChanges = this.matchChangeDetectionService.hasRecentCompletions(
        tournamentId,
        stageId,
        sinceDate
      );

      const lastChangeTime = this.matchChangeDetectionService.getLastRankingChangeTime(
        tournamentId,
        stageId
      );

      return {
        success: true,
        data: {
          hasChanges,
          lastChangeTime: lastChangeTime?.toISOString() || null,
          checkTime: new Date().toISOString(),
          since: sinceDate.toISOString(),
        },
        meta: {
          tournamentId,
          stageId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Error checking for ranking changes:', error);
      return {
        success: false,
        error: 'Failed to check for ranking changes',
        data: { hasChanges: false },
      };
    }
  }

  /**
   * Force ranking recalculation for a tournament/stage
   * POST /matches/force-recalculation
   */
  @Post('force-recalculation')
  async forceRecalculation(@Body() body: ForceRecalculationRequest) {
    try {
      const { tournamentId, stageId } = body;

      if (!tournamentId) {
        return {
          success: false,
          error: 'tournamentId is required',
        };
      }

      this.logger.log(
        `Force recalculation requested for tournament ${tournamentId}` +
        (stageId ? `, stage ${stageId}` : '')
      );

      await this.matchChangeDetectionService.forceRankingRecalculation(tournamentId, stageId);

      return {
        success: true,
        message: 'Ranking recalculation completed successfully',
        data: {
          tournamentId,
          stageId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Error during force recalculation:', error);
      return {
        success: false,
        error: 'Failed to recalculate rankings',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get recent changes for a specific tournament/stage
   * GET /matches/recent-changes?tournamentId=xxx&stageId=xxx
   */
  @Get('recent-changes')
  async getRecentChanges(@Query() query: { tournamentId: string; stageId?: string }) {
    try {
      const { tournamentId, stageId } = query;

      if (!tournamentId) {
        return {
          success: false,
          error: 'tournamentId is required',
          data: [],
        };
      }

      const changes = this.matchChangeDetectionService.getRecentChanges(tournamentId, stageId);

      const formattedChanges = changes.map(change => ({
        matchId: change.matchId,
        tournamentId: change.tournamentId,
        stageId: change.stageId,
        previousStatus: change.previousStatus,
        newStatus: change.newStatus,
        timestamp: change.timestamp.toISOString(),
        affectedTeamsCount: change.affectedTeamIds.length,
        isRankingAffecting: change.newStatus === 'COMPLETED',
      }));

      return {
        success: true,
        data: formattedChanges,
        meta: {
          count: formattedChanges.length,
          tournamentId,
          stageId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Error retrieving recent changes:', error);
      return {
        success: false,
        error: 'Failed to retrieve recent changes',
        data: [],
      };
    }
  }

  /**
   * Health check endpoint for the polling system
   * GET /matches/polling-health
   */
  @Get('polling-health')
  async getPollingHealth() {
    try {
      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
      };
    } catch (error) {
      this.logger.error('Error in polling health check:', error);
      return {
        success: false,
        error: 'Health check failed',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
