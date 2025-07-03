import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { StageAdvancementService, AdvancementOptions } from './stage-advancement.service';
import { PrismaService } from '../prisma.service';
import { StageStatus, MatchState, StageType } from '../utils/prisma-types';

describe('StageAdvancementService', () => {
  let service: StageAdvancementService;
  let prisma: DeepMockProxy<PrismaService>;
  const mockPrismaService = mockDeep<PrismaService>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageAdvancementService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StageAdvancementService>(StageAdvancementService);
    prisma = mockPrismaService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('advanceTeamsToNextStage', () => {    const mockStage = {
      id: 'stage-1',
      name: 'Swiss Stage A',
      type: StageType.SWISS,
      status: StageStatus.ACTIVE,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      tournamentId: 'tournament-1',
      teamsPerAlliance: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      tournament: { 
        id: 'tournament-1', 
        name: 'Test Tournament',
        description: null,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-02'),
        location: null,
        maxTeams: 24,
        registrationOpen: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      matches: [],
      teams: [
        { 
          id: 'team-1', 
          teamNumber: '1001', 
          name: 'Team A',
          organization: null,
          avatar: null,
          description: null,
          teamLead: null,
          teamLeadId: null,
          teamMembers: null,
          tournamentId: 'tournament-1',
          currentStageId: 'stage-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { 
          id: 'team-2', 
          teamNumber: '1002', 
          name: 'Team B',
          organization: null,
          avatar: null,
          description: null,
          teamLead: null,
          teamLeadId: null,
          teamMembers: null,
          tournamentId: 'tournament-1',
          currentStageId: 'stage-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { 
          id: 'team-3', 
          teamNumber: '1003', 
          name: 'Team C',
          organization: null,
          avatar: null,
          description: null,
          teamLead: null,
          teamLeadId: null,
          teamMembers: null,
          tournamentId: 'tournament-1',
          currentStageId: 'stage-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { 
          id: 'team-4', 
          teamNumber: '1004', 
          name: 'Team D',
          organization: null,
          avatar: null,
          description: null,
          teamLead: null,
          teamLeadId: null,
          teamMembers: null,
          tournamentId: 'tournament-1',
          currentStageId: 'stage-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
    };const mockTeamStats = [
      {
        id: 'ts-1',
        teamId: 'team-1',
        tournamentId: 'tournament-1',
        stageId: 'stage-1',
        team: { 
          id: 'team-1', 
          teamNumber: '1001', 
          name: 'Team A',
          organization: null,
          avatar: null,
          description: null,
          teamLead: null,
          teamLeadId: null,
          teamMembers: null,
          tournamentId: 'tournament-1',
          currentStageId: 'stage-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        wins: 5, losses: 1, ties: 0, pointsScored: 150, pointsConceded: 80,
        pointDifferential: 70, rankingPoints: 15, tiebreaker1: 25.0, tiebreaker2: 0.8,
        matchesPlayed: 6,
        opponentWinPercentage: 0.6,
        rank: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ts-2',
        teamId: 'team-2',
        tournamentId: 'tournament-1',
        stageId: 'stage-1',
        team: { 
          id: 'team-2', 
          teamNumber: '1002', 
          name: 'Team B',
          organization: null,
          avatar: null,
          description: null,
          teamLead: null,
          teamLeadId: null,
          teamMembers: null,
          tournamentId: 'tournament-1',
          currentStageId: 'stage-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        wins: 4, losses: 2, ties: 0, pointsScored: 140, pointsConceded: 90,
        pointDifferential: 50, rankingPoints: 12, tiebreaker1: 23.3, tiebreaker2: 0.7,
        matchesPlayed: 6,
        opponentWinPercentage: 0.5,
        rank: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ts-3',
        teamId: 'team-3',
        tournamentId: 'tournament-1',
        stageId: 'stage-1',
        team: { 
          id: 'team-3', 
          teamNumber: '1003', 
          name: 'Team C',
          organization: null,
          avatar: null,
          description: null,
          teamLead: null,
          teamLeadId: null,
          teamMembers: null,
          tournamentId: 'tournament-1',
          currentStageId: 'stage-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        wins: 3, losses: 3, ties: 0, pointsScored: 120, pointsConceded: 110,
        pointDifferential: 10, rankingPoints: 9, tiebreaker1: 20.0, tiebreaker2: 0.6,
        matchesPlayed: 6,
        opponentWinPercentage: 0.4,
        rank: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ts-4',
        teamId: 'team-4',
        tournamentId: 'tournament-1',
        stageId: 'stage-1',
        team: { 
          id: 'team-4', 
          teamNumber: '1004', 
          name: 'Team D',
          organization: null,
          avatar: null,
          description: null,
          teamLead: null,
          teamLeadId: null,
          teamMembers: null,
          tournamentId: 'tournament-1',
          currentStageId: 'stage-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        wins: 2, losses: 4, ties: 0, pointsScored: 100, pointsConceded: 130,
        pointDifferential: -30, rankingPoints: 6, tiebreaker1: 16.7, tiebreaker2: 0.5,
        matchesPlayed: 6,
        opponentWinPercentage: 0.3,
        rank: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];    const mockNextStage = {
      id: 'stage-2',
      name: 'Swiss Stage B',
      type: StageType.SWISS,
      status: StageStatus.ACTIVE,
      startDate: new Date('2025-01-03'),
      endDate: new Date('2025-01-04'),
      tournamentId: 'tournament-1',
      teamsPerAlliance: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      tournament: { 
        id: 'tournament-1', 
        name: 'Test Tournament',
        description: null,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-02'),
        location: null,
        maxTeams: 24,
        registrationOpen: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      matches: [],
      teams: []
    };it('should successfully advance teams to next stage', async () => {
      const options: AdvancementOptions = {
        teamsToAdvance: 2,
        nextStageId: 'stage-2'
      };

      // Mock the database calls - need to handle multiple findUnique calls
      mockPrismaService.stage.findUnique
        .mockResolvedValueOnce(mockStage)  // First call in validateStageForAdvancement
        .mockResolvedValueOnce(mockNextStage); // Second call to get next stage
      mockPrismaService.match.findMany.mockResolvedValue([]); // No incomplete matches
      mockPrismaService.teamStats.findMany.mockResolvedValue(mockTeamStats);

      const transactionResult = {
        advancedTeams: [
          { id: 'team-1', teamNumber: '1001', name: 'Team A' },
          { id: 'team-2', teamNumber: '1002', name: 'Team B' }
        ],
        completedStage: { ...mockStage, status: StageStatus.COMPLETED },
        nextStage: mockNextStage,
        totalTeamsAdvanced: 2
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          stage: {
            update: jest.fn().mockResolvedValue({ ...mockStage, status: StageStatus.COMPLETED })
          },
          team: {
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
            findMany: jest.fn().mockResolvedValue(transactionResult.advancedTeams)
          }
        };
        return await callback(mockTx);
      });

      const result = await service.advanceTeamsToNextStage('stage-1', options);

      expect(result).toEqual(transactionResult);
      expect(result.totalTeamsAdvanced).toBe(2);
      expect(result.advancedTeams).toHaveLength(2);
      expect(result.advancedTeams[0].teamNumber).toBe('1001'); // Top team
      expect(result.advancedTeams[1].teamNumber).toBe('1002'); // Second team
    });

    it('should throw NotFoundException when stage does not exist', async () => {
      mockPrismaService.stage.findUnique.mockResolvedValue(null);

      const options: AdvancementOptions = { teamsToAdvance: 2 };

      await expect(
        service.advanceTeamsToNextStage('non-existent-stage', options)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when stage is already completed', async () => {
      const completedStage = { ...mockStage, status: StageStatus.COMPLETED };
      mockPrismaService.stage.findUnique.mockResolvedValue(completedStage);

      const options: AdvancementOptions = { teamsToAdvance: 2 };

      await expect(
        service.advanceTeamsToNextStage('stage-1', options)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when matches are incomplete', async () => {      mockPrismaService.stage.findUnique.mockResolvedValue(mockStage);
      mockPrismaService.match.findMany.mockResolvedValue([
        { 
          id: 'match-1', 
          matchNumber: 1, 
          status: MatchState.PENDING,
          roundNumber: 1,
          startTime: null,
          scheduledTime: new Date(),
          endTime: null,
          duration: null,
          winningAlliance: null,
          stageId: 'stage-1',
          scoredById: null,
          roundType: null,
          scheduleId: null,
          fieldId: null,
          matchType: 'FULL',
          matchDuration: null,
          updatedAt: new Date(),
        },
        { 
          id: 'match-2', 
          matchNumber: 2, 
          status: MatchState.IN_PROGRESS,
          roundNumber: 1,
          startTime: new Date(),
          scheduledTime: new Date(),
          endTime: null,
          duration: null,
          winningAlliance: null,
          stageId: 'stage-1',
          scoredById: null,
          roundType: null,
          scheduleId: null,
          fieldId: null,
          matchType: 'FULL',
          matchDuration: null,
          updatedAt: new Date(),
        }
      ]);

      const options: AdvancementOptions = { teamsToAdvance: 2 };

      await expect(
        service.advanceTeamsToNextStage('stage-1', options)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to advance more teams than available', async () => {
      mockPrismaService.stage.findUnique.mockResolvedValue(mockStage);
      mockPrismaService.match.findMany.mockResolvedValue([]);
      mockPrismaService.teamStats.findMany.mockResolvedValue(mockTeamStats);

      const options: AdvancementOptions = { teamsToAdvance: 10 }; // More than 4 available

      await expect(
        service.advanceTeamsToNextStage('stage-1', options)
      ).rejects.toThrow(BadRequestException);
    });

    it('should create next stage when createNextStage option is true', async () => {
      const options: AdvancementOptions = {
        teamsToAdvance: 2,
        createNextStage: true,
        nextStageConfig: {
          name: 'Playoffs',
          type: 'PLAYOFF',
          startDate: new Date('2025-01-05'),
          endDate: new Date('2025-01-06'),
          teamsPerAlliance: 2
        }
      };

      mockPrismaService.stage.findUnique.mockResolvedValue(mockStage);
      mockPrismaService.match.findMany.mockResolvedValue([]);
      mockPrismaService.teamStats.findMany.mockResolvedValue(mockTeamStats);
      mockPrismaService.stage.create.mockResolvedValue(mockNextStage);

      const transactionResult = {
        advancedTeams: [
          { id: 'team-1', teamNumber: '1001', name: 'Team A' },
          { id: 'team-2', teamNumber: '1002', name: 'Team B' }
        ],
        completedStage: { ...mockStage, status: StageStatus.COMPLETED },
        nextStage: mockNextStage,
        totalTeamsAdvanced: 2
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          stage: {
            update: jest.fn().mockResolvedValue({ ...mockStage, status: StageStatus.COMPLETED })
          },
          team: {
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
            findMany: jest.fn().mockResolvedValue(transactionResult.advancedTeams)
          }
        };
        return await callback(mockTx);
      });

      const result = await service.advanceTeamsToNextStage('stage-1', options);

      expect(mockPrismaService.stage.create).toHaveBeenCalledWith({
        data: {
          name: 'Playoffs',
          type: 'PLAYOFF',
          status: StageStatus.ACTIVE,
          startDate: options.nextStageConfig?.startDate,
          endDate: options.nextStageConfig?.endDate,
          tournamentId: 'tournament-1',
          teamsPerAlliance: 2
        }
      });
      expect(result.totalTeamsAdvanced).toBe(2);
    });
  });
  describe('getStageRankings', () => {
    it('should return team rankings for a stage', async () => {
      const mockStageForRankings = {
        id: 'stage-1',
        name: 'Swiss Stage A',
        type: StageType.SWISS,
        status: StageStatus.ACTIVE,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-02'),
        tournamentId: 'tournament-1',
        teamsPerAlliance: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        teams: [{ id: 'team-1' }, { id: 'team-2' }]
      };

      const mockTeamStatsForRankings = [
        {
          id: 'ts-1',
          teamId: 'team-1',
          tournamentId: 'tournament-1',
          stageId: 'stage-1',
          team: { 
            id: 'team-1', 
            teamNumber: '1001', 
            name: 'Team A',
            organization: null,
            avatar: null,
            description: null,
            teamLead: null,
            teamLeadId: null,
            teamMembers: null,
            tournamentId: 'tournament-1',
            currentStageId: 'stage-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          wins: 5, losses: 1, ties: 0, pointsScored: 150, pointsConceded: 80,
          pointDifferential: 70, rankingPoints: 15, tiebreaker1: 25.0, tiebreaker2: 0.8,
          matchesPlayed: 6,
          opponentWinPercentage: 0.6,
          rank: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      mockPrismaService.stage.findUnique.mockResolvedValue(mockStageForRankings);
      mockPrismaService.teamStats.findMany.mockResolvedValue(mockTeamStatsForRankings);

      const result = await service.getStageRankings('stage-1');

      expect(result).toHaveLength(1);
      expect(result[0].teamNumber).toBe('1001');
      expect(result[0].rank).toBe(1);
    });
  });
  describe('isStageReadyForAdvancement', () => {
    it('should return ready true when stage can be advanced', async () => {
      const mockStageReadiness = {
        id: 'stage-1',
        name: 'Swiss Stage A',
        type: StageType.SWISS,
        status: StageStatus.ACTIVE,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-02'),
        tournamentId: 'tournament-1',
        teamsPerAlliance: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        teams: [{ id: 'team-1' }, { id: 'team-2' }]
      };

      mockPrismaService.stage.findUnique.mockResolvedValue(mockStageReadiness);
      mockPrismaService.match.findMany.mockResolvedValue([]); // No incomplete matches

      const result = await service.isStageReadyForAdvancement('stage-1');

      expect(result.ready).toBe(true);
      expect(result.totalTeams).toBe(2);
    });    it('should return ready false when matches are incomplete', async () => {
      const mockStageIncomplete = {
        id: 'stage-1',
        name: 'Swiss Stage A',
        type: StageType.SWISS,
        status: StageStatus.ACTIVE,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-02'),
        tournamentId: 'tournament-1',
        teamsPerAlliance: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        teams: [{ id: 'team-1' }, { id: 'team-2' }]
      };

      mockPrismaService.stage.findUnique.mockResolvedValue(mockStageIncomplete);
      mockPrismaService.match.findMany.mockResolvedValue([
        { 
          id: 'match-1', 
          matchNumber: 1, 
          status: MatchState.PENDING,
          roundNumber: 1,
          startTime: null,
          scheduledTime: new Date(),
          endTime: null,
          duration: null,
          winningAlliance: null,
          stageId: 'stage-1',
          scoredById: null,
          roundType: null,
          scheduleId: null,
          fieldId: null,
          matchType: 'FULL',
          matchDuration: null,
          updatedAt: new Date(),
        }
      ]);
      mockPrismaService.match.count.mockResolvedValue(1);

      const result = await service.isStageReadyForAdvancement('stage-1');

      expect(result.ready).toBe(false);
      expect(result.incompleteMatches).toBe(1);
      expect(result.reason).toContain('1 matches are still incomplete');
    });
  });
});
