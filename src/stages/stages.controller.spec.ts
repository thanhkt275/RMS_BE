import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';
import { StageAdvancementService } from './stage-advancement.service';
import { PrismaService } from '../prisma.service';
import { AdvanceTeamsDto } from './dto/advance-teams.dto';
import { StageStatus, StageType, UserRole } from '../utils/prisma-types';

describe('StagesController - Stage Advancement', () => {
  let controller: StagesController;
  let stagesService: StagesService;
  let stageAdvancementService: StageAdvancementService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StagesController],
      providers: [
        StagesService,
        StageAdvancementService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<StagesController>(StagesController);
    stagesService = module.get<StagesService>(StagesService);
    stageAdvancementService = module.get<StageAdvancementService>(StageAdvancementService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all Prisma mocks
    jest.clearAllMocks();
  });

  describe('advanceTeams', () => {    const mockAdvancementResult = {
      advancedTeams: [
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
          currentStageId: 'stage-2',
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
          currentStageId: 'stage-2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      completedStage: {
        id: 'stage-1',
        name: 'Swiss Stage A',
        status: StageStatus.COMPLETED,
        type: StageType.SWISS,
        startDate: new Date(),
        endDate: new Date(),
        tournamentId: 'tournament-1',
        teamsPerAlliance: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      nextStage: {
        id: 'stage-2',
        name: 'Swiss Stage B',
        type: StageType.SWISS,
        status: StageStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(),
        tournamentId: 'tournament-1',
        teamsPerAlliance: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      totalTeamsAdvanced: 2,
    };    const advanceTeamsDto: AdvanceTeamsDto = {
      teamsToAdvance: 2,
      nextStageId: 'stage-2',
      createNextStage: false,
    };    it('should successfully advance teams to next stage', async () => {
      const advanceTeamsSpy = jest.spyOn(stageAdvancementService, 'advanceTeamsToNextStage').mockResolvedValue(mockAdvancementResult);

      const result = await controller.advanceTeams('stage-1', advanceTeamsDto);

      expect(advanceTeamsSpy).toHaveBeenCalledWith('stage-1', {
        teamsToAdvance: 2,
        nextStageId: 'stage-2',
        createNextStage: false,
        nextStageConfig: undefined,
      });

      expect(result).toEqual({
        success: true,
        message: 'Successfully advanced 2 teams from stage "Swiss Stage A" to "Swiss Stage B"',
        data: {
          advancedTeams: [
            { id: 'team-1', teamNumber: '1001', name: 'Team A', currentStageId: 'stage-2' },
            { id: 'team-2', teamNumber: '1002', name: 'Team B', currentStageId: 'stage-2' },
          ],
          completedStage: {
            id: 'stage-1',
            name: 'Swiss Stage A',
            status: StageStatus.COMPLETED,
          },
          nextStage: {
            id: 'stage-2',
            name: 'Swiss Stage B',
            type: StageType.SWISS,
          },
          totalTeamsAdvanced: 2,
        },
      });
    });

    it('should handle advancement with auto-created next stage', async () => {
      const dtoWithNewStage: AdvanceTeamsDto = {
        teamsToAdvance: 2,
        createNextStage: true,
        nextStageConfig: {
          name: 'Playoffs',
          type: StageType.PLAYOFF,
          startDate: new Date('2025-01-05'),
          endDate: new Date('2025-01-06'),
          teamsPerAlliance: 2,
        },
      };

      const resultWithNewStage = {
        ...mockAdvancementResult,
        nextStage: {
          id: 'stage-playoff',
          name: 'Playoffs',
          type: StageType.PLAYOFF,
          status: StageStatus.ACTIVE,
          startDate: new Date('2025-01-05'),
          endDate: new Date('2025-01-06'),
          tournamentId: 'tournament-1',
          teamsPerAlliance: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const advanceTeamsSpy2 = jest.spyOn(stageAdvancementService, 'advanceTeamsToNextStage').mockResolvedValue(resultWithNewStage);

      const result = await controller.advanceTeams('stage-1', dtoWithNewStage);

      expect(result.success).toBe(true);
      expect(result.data.nextStage?.name).toBe('Playoffs');
      expect(result.data.nextStage?.type).toBe(StageType.PLAYOFF);
    });

    it('should handle advancement errors properly', async () => {
      const error = new Error('Stage has incomplete matches');
      const advanceTeamsSpy3 = jest.spyOn(stageAdvancementService, 'advanceTeamsToNextStage').mockRejectedValue(error);

      await expect(controller.advanceTeams('stage-1', advanceTeamsDto)).rejects.toThrow(HttpException);

      try {
        await controller.advanceTeams('stage-1', advanceTeamsDto);
      } catch (exception) {
        expect(exception).toBeInstanceOf(HttpException);
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.getResponse()).toEqual({
          success: false,
          message: 'Stage has incomplete matches',
          error: 'Error',
        });
      }
    });
  });

  describe('getStageRankings', () => {
    const mockRankings = [
      {
        teamId: 'team-1',
        teamNumber: '1001',
        teamName: 'Team A',
        wins: 5,
        losses: 1,
        ties: 0,
        pointsScored: 150,
        pointsConceded: 80,
        pointDifferential: 70,
        rankingPoints: 15,
        rank: 1,
        matchesPlayed: 0,
        opponentWinPercentage: 0,
      },
      {
        teamId: 'team-2',
        teamNumber: '1002',
        teamName: 'Team B',
        wins: 4,
        losses: 2,
        ties: 0,
        pointsScored: 140,
        pointsConceded: 90,
        pointDifferential: 50,
        rankingPoints: 12,
        rank: 2,
        matchesPlayed: 0,
        opponentWinPercentage: 0,
      },
    ];    it('should return stage rankings successfully', async () => {
      const getRankingsSpy = jest.spyOn(stageAdvancementService, 'getStageRankings').mockResolvedValue(mockRankings);

      const result = await controller.getStageRankings('stage-1');

      expect(getRankingsSpy).toHaveBeenCalledWith('stage-1');
      expect(result).toEqual({
        success: true,
        message: 'Retrieved rankings for stage',
        data: mockRankings,
      });
    });

    it('should handle rankings errors properly', async () => {
      const error = new Error('Stage not found');
      const getRankingsSpy2 = jest.spyOn(stageAdvancementService, 'getStageRankings').mockRejectedValue(error);

      await expect(controller.getStageRankings('invalid-stage')).rejects.toThrow(HttpException);
    });
  });

  describe('checkStageReadiness', () => {    it('should return ready status when stage can be advanced', async () => {
      const mockReadiness = {
        ready: true,
        totalTeams: 8,
      };

      const readinessSpy = jest.spyOn(stageAdvancementService, 'isStageReadyForAdvancement').mockResolvedValue(mockReadiness);

      const result = await controller.checkStageReadiness('stage-1');

      expect(result).toEqual({
        success: true,
        message: 'Stage is ready for advancement',
        data: {
          ready: true,
          reason: undefined,
          incompleteMatches: undefined,
          totalTeams: 8,
        },
      });
    });

    it('should return not ready status with reason', async () => {
      const mockReadiness = {
        ready: false,
        reason: 'Stage has 3 incomplete matches',
        incompleteMatches: 3,
        totalTeams: 8,
      };

      const readinessSpy2 = jest.spyOn(stageAdvancementService, 'isStageReadyForAdvancement').mockResolvedValue(mockReadiness);

      const result = await controller.checkStageReadiness('stage-1');

      expect(result).toEqual({
        success: true,
        message: 'Stage is not ready for advancement: Stage has 3 incomplete matches',
        data: {
          ready: false,
          reason: 'Stage has 3 incomplete matches',
          incompleteMatches: 3,
          totalTeams: 8,
        },
      });
    });
  });
  describe('previewAdvancement', () => {
    const mockRankings = [
      { teamId: 'team-1', teamNumber: '1001', teamName: 'Team A', rank: 1, wins: 5, losses: 1, ties: 0, pointsScored: 150, pointsConceded: 80, pointDifferential: 70, rankingPoints: 15, matchesPlayed: 0, opponentWinPercentage: 0 },
      { teamId: 'team-2', teamNumber: '1002', teamName: 'Team B', rank: 2, wins: 4, losses: 2, ties: 0, pointsScored: 140, pointsConceded: 90, pointDifferential: 50, rankingPoints: 12, matchesPlayed: 0, opponentWinPercentage: 0 },
      { teamId: 'team-3', teamNumber: '1003', teamName: 'Team C', rank: 3, wins: 3, losses: 3, ties: 0, pointsScored: 120, pointsConceded: 110, pointDifferential: 10, rankingPoints: 9, matchesPlayed: 0, opponentWinPercentage: 0 },
      { teamId: 'team-4', teamNumber: '1004', teamName: 'Team D', rank: 4, wins: 2, losses: 4, ties: 0, pointsScored: 100, pointsConceded: 130, pointDifferential: -30, rankingPoints: 6, matchesPlayed: 0, opponentWinPercentage: 0 },
    ];

    beforeEach(() => {
      jest.spyOn(stageAdvancementService, 'getStageRankings').mockResolvedValue(mockRankings);
    });

    it('should preview advancement with specified number of teams', async () => {
      const result = await controller.previewAdvancement('stage-1', '2');

      expect(result).toEqual({
        success: true,
        message: 'Preview: 2 teams would be advanced',
        data: {
          teamsToAdvance: mockRankings.slice(0, 2),
          remainingTeams: mockRankings.slice(2),
          totalTeams: 4,
          advancementPercentage: 50,
        },
      });
    });

    it('should use default (half) when no number specified', async () => {
      const result = await controller.previewAdvancement('stage-1');

      expect(result.data.teamsToAdvance).toHaveLength(2); // Half of 4
      expect(result.data.advancementPercentage).toBe(50);
    });

    it('should handle invalid team count', async () => {
      await expect(controller.previewAdvancement('stage-1', 'invalid')).rejects.toThrow(HttpException);

      try {
        await controller.previewAdvancement('stage-1', 'invalid');
      } catch (exception) {
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.getResponse()).toEqual({
          success: false,
          message: 'Invalid number of teams to advance',
          error: 'ValidationError',
        });
      }
    });

    it('should handle too many teams requested', async () => {
      await expect(controller.previewAdvancement('stage-1', '10')).rejects.toThrow(HttpException);

      try {
        await controller.previewAdvancement('stage-1', '10');
      } catch (exception) {
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.getResponse()).toEqual({
          success: false,
          message: 'Cannot advance 10 teams when only 4 teams participated',
          error: 'ValidationError',
        });
      }
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete advancement workflow', async () => {      // First check readiness
      const readinessSpy3 = jest.spyOn(stageAdvancementService, 'isStageReadyForAdvancement').mockResolvedValue({
        ready: true,
        totalTeams: 8,
      });

      const readinessResult = await controller.checkStageReadiness('stage-1');
      expect(readinessResult.data.ready).toBe(true);      // Then preview advancement
      const mockRankings = Array.from({ length: 8 }, (_, i) => ({
        teamId: `team-${i + 1}`,
        teamNumber: `100${i + 1}`,
        teamName: `Team ${String.fromCharCode(65 + i)}`,
        rank: i + 1,
        wins: 5 - i,
        losses: i,
        ties: 0,
        pointsScored: 150 - i * 10,
        pointsConceded: 80 + i * 10,
        pointDifferential: 70 - i * 20,
        rankingPoints: 15 - i * 2,
        matchesPlayed: 0,
        opponentWinPercentage: 0,
      }));

      const getRankingsSpy3 = jest.spyOn(stageAdvancementService, 'getStageRankings').mockResolvedValue(mockRankings);

      const previewResult = await controller.previewAdvancement('stage-1', '4');
      expect(previewResult.data.teamsToAdvance).toHaveLength(4);      // Finally advance teams
      const mockAdvancementResult = {
        advancedTeams: mockRankings.slice(0, 4).map(team => ({
          id: team.teamId,
          teamNumber: team.teamNumber,
          name: team.teamName,
          organization: null,
          avatar: null,
          description: null,
          teamLead: null,
          teamLeadId: null,
          teamMembers: null,
          tournamentId: 'tournament-1',
          currentStageId: 'stage-2',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        completedStage: {
          id: 'stage-1',
          name: 'Swiss Stage A',
          status: StageStatus.COMPLETED,
          type: StageType.SWISS,
          startDate: new Date(),
          endDate: new Date(),
          tournamentId: 'tournament-1',
          teamsPerAlliance: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nextStage: {
          id: 'stage-2',
          name: 'Swiss Stage B',
          type: StageType.SWISS,
          status: StageStatus.ACTIVE,
          startDate: new Date(),
          endDate: new Date(),
          tournamentId: 'tournament-1',
          teamsPerAlliance: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        totalTeamsAdvanced: 4,
      };

      const advanceTeamsSpy4 = jest.spyOn(stageAdvancementService, 'advanceTeamsToNextStage').mockResolvedValue(mockAdvancementResult);

      const advancementResult = await controller.advanceTeams('stage-1', {
        teamsToAdvance: 4,
        nextStageId: 'stage-2',
        createNextStage: false,
      });

      expect(advancementResult.success).toBe(true);
      expect(advancementResult.data.totalTeamsAdvanced).toBe(4);
    });
  });
});
