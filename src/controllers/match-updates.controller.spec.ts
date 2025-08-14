/**
 * Tests for MatchUpdatesController
 * 
 * Tests the polling-based ranking system API endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MatchUpdatesController } from './match-updates.controller';
import { MatchChangeDetectionService } from '../matches/match-change-detection.service';
import { MatchState } from '../utils/prisma-types';

describe('MatchUpdatesController', () => {
  let controller: MatchUpdatesController;
  let mockMatchChangeDetectionService: jest.Mocked<MatchChangeDetectionService>;

  const mockRecentUpdates = [
    {
      id: 'match-1',
      matchNumber: 1,
      status: MatchState.COMPLETED,
      updatedAt: new Date(),
      tournamentId: 'tournament-1',
      stageId: 'stage-1',
      winningAlliance: 'RED',
    },
    {
      id: 'match-2',
      matchNumber: 2,
      status: MatchState.IN_PROGRESS,
      updatedAt: new Date(),
      tournamentId: 'tournament-1',
      stageId: 'stage-1',
    },
  ];

  const mockActivityStats = {
    totalChanges: 5,
    recentCompletions: 2,
    lastChangeTime: new Date(),
    affectedTeams: new Set(['team-1', 'team-2', 'team-3']),
  };

  beforeEach(async () => {
    const mockService = {
      getRecentMatchUpdates: jest.fn(),
      getActivityStats: jest.fn(),
      hasRecentCompletions: jest.fn(),
      getLastRankingChangeTime: jest.fn(),
      forceRankingRecalculation: jest.fn(),
      getRecentChanges: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchUpdatesController],
      providers: [
        {
          provide: MatchChangeDetectionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MatchUpdatesController>(MatchUpdatesController);
    mockMatchChangeDetectionService = module.get(MatchChangeDetectionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRecentUpdates', () => {
    it('should return recent match updates', async () => {
      mockMatchChangeDetectionService.getRecentMatchUpdates.mockResolvedValue(mockRecentUpdates);

      const result = await controller.getRecentUpdates({
        tournamentId: 'tournament-1',
        stageId: 'stage-1',
        since: '1640995200000', // timestamp
        limit: '50',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecentUpdates);
      expect(result.meta?.count).toBe(2);
      expect(result.meta?.tournamentId).toBe('tournament-1');
      expect(result.meta?.stageId).toBe('stage-1');
      expect(mockMatchChangeDetectionService.getRecentMatchUpdates).toHaveBeenCalledWith(
        'tournament-1',
        'stage-1',
        1640995200000,
        50
      );
    });

    it('should return error when tournamentId is missing', async () => {
      const result = await controller.getRecentUpdates({
        tournamentId: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('tournamentId is required');
      expect(result.data).toEqual([]);
    });

    it('should handle service errors gracefully', async () => {
      mockMatchChangeDetectionService.getRecentMatchUpdates.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.getRecentUpdates({
        tournamentId: 'tournament-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve recent match updates');
      expect(result.data).toEqual([]);
    });
  });

  describe('getActivityStats', () => {
    it('should return activity statistics', async () => {
      mockMatchChangeDetectionService.getActivityStats.mockReturnValue(mockActivityStats);

      const result = await controller.getActivityStats({
        tournamentId: 'tournament-1',
        stageId: 'stage-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.totalChanges).toBe(5);
      expect(result.data?.recentCompletions).toBe(2);
      expect(result.data?.affectedTeamsCount).toBe(3);
      expect(result.data?.hasRecentActivity).toBe(true);
      expect(mockMatchChangeDetectionService.getActivityStats).toHaveBeenCalledWith(
        'tournament-1',
        'stage-1'
      );
    });

    it('should return error when tournamentId is missing', async () => {
      const result = await controller.getActivityStats({
        tournamentId: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('tournamentId is required');
      expect(result.data).toBe(null);
    });
  });

  describe('hasRankingChanges', () => {
    it('should check for recent ranking changes', async () => {
      const lastChangeTime = new Date();
      mockMatchChangeDetectionService.hasRecentCompletions.mockReturnValue(true);
      mockMatchChangeDetectionService.getLastRankingChangeTime.mockReturnValue(lastChangeTime);

      const result = await controller.hasRankingChanges({
        tournamentId: 'tournament-1',
        stageId: 'stage-1',
        since: '1640995200000',
      });

      expect(result.success).toBe(true);
      expect(result.data.hasChanges).toBe(true);
      expect(result.data.lastChangeTime).toBe(lastChangeTime.toISOString());
      expect(mockMatchChangeDetectionService.hasRecentCompletions).toHaveBeenCalledWith(
        'tournament-1',
        'stage-1',
        expect.any(Date)
      );
    });

    it('should use default since time when not provided', async () => {
      mockMatchChangeDetectionService.hasRecentCompletions.mockReturnValue(false);
      mockMatchChangeDetectionService.getLastRankingChangeTime.mockReturnValue(null);

      const result = await controller.hasRankingChanges({
        tournamentId: 'tournament-1',
      });

      expect(result.success).toBe(true);
      expect(result.data.hasChanges).toBe(false);
      expect(result.data.lastChangeTime).toBe(null);
    });
  });

  describe('forceRecalculation', () => {
    it('should force ranking recalculation', async () => {
      mockMatchChangeDetectionService.forceRankingRecalculation.mockResolvedValue();

      const result = await controller.forceRecalculation({
        tournamentId: 'tournament-1',
        stageId: 'stage-1',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Ranking recalculation completed successfully');
      expect(result.data?.tournamentId).toBe('tournament-1');
      expect(result.data?.stageId).toBe('stage-1');
      expect(mockMatchChangeDetectionService.forceRankingRecalculation).toHaveBeenCalledWith(
        'tournament-1',
        'stage-1'
      );
    });

    it('should return error when tournamentId is missing', async () => {
      const result = await controller.forceRecalculation({
        tournamentId: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('tournamentId is required');
    });

    it('should handle recalculation errors', async () => {
      mockMatchChangeDetectionService.forceRankingRecalculation.mockRejectedValue(
        new Error('Recalculation failed')
      );

      const result = await controller.forceRecalculation({
        tournamentId: 'tournament-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to recalculate rankings');
      expect(result.details).toBe('Recalculation failed');
    });
  });

  describe('getRecentChanges', () => {
    it('should return recent changes', async () => {
      const mockChanges = [
        {
          matchId: 'match-1',
          tournamentId: 'tournament-1',
          stageId: 'stage-1',
          previousStatus: MatchState.IN_PROGRESS,
          newStatus: MatchState.COMPLETED,
          timestamp: new Date(),
          affectedTeamIds: ['team-1', 'team-2'],
        },
      ];

      mockMatchChangeDetectionService.getRecentChanges.mockReturnValue(mockChanges);

      const result = await controller.getRecentChanges({
        tournamentId: 'tournament-1',
        stageId: 'stage-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].matchId).toBe('match-1');
      expect(result.data[0].isRankingAffecting).toBe(true);
      expect(result.data[0].affectedTeamsCount).toBe(2);
      expect(mockMatchChangeDetectionService.getRecentChanges).toHaveBeenCalledWith(
        'tournament-1',
        'stage-1'
      );
    });
  });

  describe('getPollingHealth', () => {
    it('should return health status', async () => {
      const result = await controller.getPollingHealth();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('healthy');
      expect(result.data.timestamp).toBeDefined();
      expect(result.data.uptime).toBeDefined();
      expect(result.data.memoryUsage).toBeDefined();
    });
  });
});
