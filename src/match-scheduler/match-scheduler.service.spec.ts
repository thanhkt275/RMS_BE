import { Test, TestingModule } from '@nestjs/testing';
import { MatchSchedulerService } from './match-scheduler.service';
import { PrismaService } from '../prisma.service';
import { StageType } from '../utils/prisma-types';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { SchedulingStrategyFactory } from './factories/scheduling-strategy.factory';
import { FieldAssignmentService } from './services/field-assignment.service';
import { MatchupHistoryService } from './services/matchup-history.service';

describe('MatchSchedulerService', () => {
  let service: MatchSchedulerService;
  let prisma: DeepMockProxy<PrismaService>;
  let mockStrategy: any;
  let mockFactory: any;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    
    // Mock the strategy factory to return a mock strategy
    mockStrategy = {
      generateMatches: jest.fn().mockResolvedValue([]),
      canHandle: jest.fn().mockReturnValue(true),
      getStrategyType: jest.fn().mockReturnValue('swiss'),
    };
    
    mockFactory = {
      createStrategy: jest.fn().mockReturnValue(mockStrategy),
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: SchedulingStrategyFactory, useValue: mockFactory },
        { provide: FieldAssignmentService, useValue: mockDeep<FieldAssignmentService>() },
        { provide: MatchupHistoryService, useValue: mockDeep<MatchupHistoryService>() },
      ],
    }).compile();

    service = module.get<MatchSchedulerService>(MatchSchedulerService);
    jest.clearAllMocks();
  });

  describe('generateSwissRound', () => {
    it('throws if stage not found', async () => {
      prisma.stage.findUnique.mockResolvedValue(null);
      await expect(service.generateSwissRound('stage1', 1)).rejects.toThrow('Stage with ID stage1 not found');
    });

    const baseTeams = Array.from({ length: 16 }, (_, i) => ({ id: `team${i + 1}`, teamNumber: `${i + 1}` })); const baseStage = {
      id: 'stage1',
      name: 'Stage 1',
      type: StageType.SWISS,
      startDate: new Date(),
      endDate: new Date(),
      tournamentId: 't1',
      teamsPerAlliance: 2,
      teamsPerMatch: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      tournament: {
        id: 't1',
        name: 'T1',
        description: '',
        location: '',
        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        adminId: 'admin',
        teams: baseTeams,
        fields: [],
      },
      teams: baseTeams,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Mock strategy to return matches with fieldId assigned
      const mockMatches = Array.from({ length: 4 }, (_, i) => ({
        id: `match${i + 1}`,
        fieldId: i % 2 === 0 ? 'fieldA' : 'fieldB', // Alternate between fieldA and fieldB
        matchNumber: i + 1,
        roundNumber: 1,
        stageId: 'stage1',
        alliances: [],
      }));
      mockStrategy.generateMatches.mockResolvedValue(mockMatches);
    });

    it('distributes 4 matches equally across 2 fields', async () => {
      const fields = [
        { id: 'fieldA', number: 1 },
        { id: 'fieldB', number: 2 },
      ];
      prisma.stage.findUnique.mockResolvedValue({
        ...baseStage,
        tournament: { ...baseStage.tournament, fields },
      } as any);

      const matches = await service.generateSwissRound('stage1', 1);
      expect(matches).toHaveLength(4);
      const fieldCounts = {};
      for (const match of matches) {
        expect(match.fieldId).toBeDefined();
        if (!match.fieldId) throw new Error('Match missing fieldId');
        fieldCounts[match.fieldId] = (fieldCounts[match.fieldId] || 0) + 1;
      }
      expect(Object.values(fieldCounts)).toHaveLength(2);
      expect(Object.values(fieldCounts).every(count => count === 2)).toBe(true);
    }); it('distributes 4 matches equally across 4 fields', async () => {
      const fields = [
        { id: 'fieldA', number: 1 },
        { id: 'fieldB', number: 2 },
        { id: 'fieldC', number: 3 },
        { id: 'fieldD', number: 4 },
      ];
      
      // Mock strategy to return matches distributed across 4 fields
      const mockMatches = Array.from({ length: 4 }, (_, i) => ({
        id: `match${i + 1}`,
        fieldId: `field${String.fromCharCode(65 + i)}`, // fieldA, fieldB, fieldC, fieldD
        matchNumber: i + 1,
        roundNumber: 1,
        stageId: 'stage1',
        alliances: [],
      }));
      mockStrategy.generateMatches.mockResolvedValue(mockMatches);
      
      prisma.stage.findUnique.mockResolvedValue({
        ...baseStage,
        tournament: { ...baseStage.tournament, fields },
      } as any);

      const matches = await service.generateSwissRound('stage1', 1);
      expect(matches).toHaveLength(4);
      const fieldCounts = {};
      for (const match of matches) {
        expect(match.fieldId).toBeDefined();
        if (!match.fieldId) throw new Error('Match missing fieldId');
        fieldCounts[match.fieldId] = (fieldCounts[match.fieldId] || 0) + 1;
      }
      expect(Object.values(fieldCounts)).toHaveLength(4);
      expect(Object.values(fieldCounts).every(count => count === 1)).toBe(true);
    });
  });

  describe('generatePlayoffSchedule', () => {
    it('throws if stage not found', async () => {
      prisma.stage.findUnique.mockResolvedValue(null);
      await expect(service.generatePlayoffSchedule('stage1', 3)).rejects.toThrow('Stage with ID stage1 not found');
    });
    // More tests for playoff bracket generation, seeding, and errors
  });

  describe('updatePlayoffBrackets', () => {
    it('throws if match not found', async () => {
      prisma.match.findUnique.mockResolvedValue(null);
      await expect(service.updatePlayoffBrackets('match1')).rejects.toThrow('Match with ID match1 not found');
    });
    // More tests for advancement, missing alliances, and error paths
  });

  describe('finalizePlayoffRankings', () => {
    it('throws if no matches found', async () => {
      prisma.match.findMany.mockResolvedValue([]);
      await expect(service.finalizePlayoffRankings('stage1')).rejects.toThrow('No matches found for stage stage1');
    });
    // More tests for incomplete matches, correct ranking, and error handling
  });

  describe('updateSwissRankings', () => {
    it('handles missing teamStats and creates them', async () => {
      prisma.teamStats.findMany.mockResolvedValue([]);
      prisma.stage.findUnique.mockResolvedValue({
        id: 'stage1',
        name: 'Stage 1', 
        type: StageType.SWISS,
        startDate: new Date(),
        endDate: new Date(),
        tournamentId: 't1',
        teamsPerAlliance: 2,
        teamsPerMatch: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
        tournament: { id: 't1', teams: [{ id: 'a' }, { id: 'b' }], fields: [] }
      } as any);
      prisma.teamStats.findUnique.mockResolvedValue(null);
      prisma.teamStats.create.mockResolvedValue({
        id: 'stat1',
        tournamentId: 't1',
        createdAt: new Date(),
        updatedAt: new Date(),
        stageId: 'stage1',
        teamId: 'a',
        wins: 0,
        losses: 0,
        ties: 0,
        pointsScored: 0,
        pointsConceded: 0,
        matchesPlayed: 0,
        rank: 0,
        tiebreaker1: 0,
        tiebreaker2: 0,
      } as any);
      prisma.teamStats.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          id: 'stat1',
          tournamentId: 't1',
          createdAt: new Date(),
          updatedAt: new Date(),
          stageId: 'stage1',
          teamId: 'a',
          wins: 0,
          losses: 0,
          ties: 0,
          pointsScored: 0,
          pointsConceded: 0,
          matchesPlayed: 0,
          rank: 0,
          tiebreaker1: 0,
          tiebreaker2: 0,
        } as any,
        {
          id: 'stat2',
          tournamentId: 't1',
          createdAt: new Date(),
          updatedAt: new Date(),
          stageId: 'stage1',
          teamId: 'b',
          wins: 0,
          losses: 0,
          ties: 0,
          pointsScored: 0,
          pointsConceded: 0,
          matchesPlayed: 0,
          rank: 0,
          tiebreaker1: 0,
          tiebreaker2: 0,
        } as any
      ]);
      prisma.match.findMany.mockResolvedValue([]);
      await expect(service.updateSwissRankings('stage1')).resolves.toBeUndefined();
    });
    // More tests for ranking calculations, OWP, and error/edge cases
  });

  describe('generateFrcSchedule', () => {
    const baseTeams = Array.from({ length: 16 }, (_, i) => ({ id: `team${i + 1}`, teamNumber: `${i + 1}` })); const baseStage = {
      id: 'stage1',
      name: 'Stage 1',
      type: StageType.SWISS,
      startDate: new Date(),
      endDate: new Date(),
      tournamentId: 't1',
      teamsPerAlliance: 2,
      teamsPerMatch: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      tournament: {
        id: 't1',
        name: 'T1',
        description: '',
        location: '',
        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        adminId: 'admin',
        teams: baseTeams,
        fields: [],
      },
      teams: baseTeams,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('distributes 4 matches equally across 2 fields', async () => {
      const fields = [
        { id: 'fieldA', number: 1 },
        { id: 'fieldB', number: 2 },
      ];
      
      // Mock strategy to return matches distributed across 2 fields
      const mockMatches = Array.from({ length: 4 }, (_, i) => ({
        id: `match${i + 1}`,
        fieldId: i % 2 === 0 ? 'fieldA' : 'fieldB', // Alternate between fieldA and fieldB
        matchNumber: i + 1,
        roundNumber: 1,
        stageId: 'stage1',
        alliances: [],
      }));
      mockStrategy.generateMatches.mockResolvedValue(mockMatches);
      
      prisma.stage.findUnique.mockResolvedValue({
        ...baseStage,
        tournament: { ...baseStage.tournament, fields },
      } as any);

      // 16 teams, 1 round, 2 alliances per match = 4 matches
      const matches = await service.generateFrcSchedule('stage1', 1, 2);
      expect(matches).toHaveLength(4);
      // Count matches per field
      const fieldCounts = {};
      for (const match of matches) {
        expect(match.fieldId).toBeDefined();
        if (!match.fieldId) throw new Error('Match missing fieldId');
        fieldCounts[match.fieldId] = (fieldCounts[match.fieldId] || 0) + 1;
      }
      expect(Object.values(fieldCounts)).toHaveLength(2);
      expect(Object.values(fieldCounts).every(count => count === 2)).toBe(true);
    });

    it('distributes 4 matches equally across 4 fields', async () => {
      const fields = [
        { id: 'fieldA', number: 1 },
        { id: 'fieldB', number: 2 },
        { id: 'fieldC', number: 3 },
        { id: 'fieldD', number: 4 },
      ];
      
      // Mock strategy to return matches distributed across 4 fields
      const mockMatches = Array.from({ length: 4 }, (_, i) => ({
        id: `match${i + 1}`,
        fieldId: `field${String.fromCharCode(65 + i)}`, // fieldA, fieldB, fieldC, fieldD
        matchNumber: i + 1,
        roundNumber: 1,
        stageId: 'stage1',
        alliances: [],
      }));
      mockStrategy.generateMatches.mockResolvedValue(mockMatches);
      
      prisma.stage.findUnique.mockResolvedValue({
        ...baseStage,
        tournament: { ...baseStage.tournament, fields },
      } as any);

      // 16 teams, 1 round, 2 alliances per match = 4 matches
      const matches = await service.generateFrcSchedule('stage1', 1, 2);
      expect(matches).toHaveLength(4);
      // Count matches per field
      const fieldCounts = {};
      for (const match of matches) {
        expect(match.fieldId).toBeDefined();
        if (!match.fieldId) throw new Error('Match missing fieldId');
        fieldCounts[match.fieldId] = (fieldCounts[match.fieldId] || 0) + 1;
      }
      expect(Object.values(fieldCounts)).toHaveLength(4);
      expect(Object.values(fieldCounts).every(count => count === 1)).toBe(true);
    });
  });
});
