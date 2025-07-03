import { Test, TestingModule } from '@nestjs/testing';
import { MatchSchedulerService } from './match-scheduler.service';
import { PrismaService } from '../prisma.service';
import { StageType } from '../utils/prisma-types';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('MatchSchedulerService', () => {
  let service: MatchSchedulerService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchSchedulerService,
        { provide: PrismaService, useValue: prisma },
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
    };

    beforeEach(() => {
      jest.clearAllMocks();
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
      prisma.teamStats.findMany.mockResolvedValue(baseTeams.map((t, i) => ({
        id: `stat${i + 1}`,
        tournamentId: 't1',
        createdAt: new Date(),
        updatedAt: new Date(),
        stageId: 'stage1',
        teamId: t.id,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsScored: 0,
        pointsConceded: 0,
        matchesPlayed: 0,
        rank: 0,
        tiebreaker1: 0,
        tiebreaker2: 0,
        team: t,
      } as any))); prisma.match.findMany.mockResolvedValue([]);
      prisma.match.create.mockImplementation(({ data }) => Promise.resolve({
        ...data,
        id: Math.random().toString(),
        stage: { name: 'Stage 1' },
        alliances: [],
      }) as any);
      prisma.matchScore.create.mockResolvedValue({
        id: 'score1',
        createdAt: new Date(),
        updatedAt: new Date(),
        scoreDetails: {},
        matchId: 'match1',
        redAutoScore: 0,
        redDriveScore: 0,
        redTotalScore: 0,
        blueAutoScore: 0,
        blueDriveScore: 0,
        blueTotalScore: 0,
        redTeamCount: 0,
        blueTeamCount: 0,
        redMultiplier: 1,
        blueMultiplier: 1,
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
      prisma.stage.findUnique.mockResolvedValue({
        ...baseStage,
        tournament: { ...baseStage.tournament, fields },
      } as any);
      prisma.teamStats.findMany.mockResolvedValue(baseTeams.map((t, i) => ({
        id: `stat${i + 1}`,
        tournamentId: 't1',
        createdAt: new Date(),
        updatedAt: new Date(),
        stageId: 'stage1',
        teamId: t.id,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsScored: 0,
        pointsConceded: 0,
        matchesPlayed: 0,
        rank: 0,
        tiebreaker1: 0,
        tiebreaker2: 0,
        team: t,
      } as any)));
      prisma.match.findMany.mockResolvedValue([]);
      prisma.match.create.mockImplementation(({ data }) => Promise.resolve({
        ...data,
        id: Math.random().toString(),
        stage: { name: 'Stage 1' },
        alliances: [],
      }) as any);
      prisma.matchScore.create.mockResolvedValue({
        id: 'score1',
        createdAt: new Date(),
        updatedAt: new Date(),
        scoreDetails: {},
        matchId: 'match1',
        redAutoScore: 0,
        redDriveScore: 0,
        redTotalScore: 0,
        blueAutoScore: 0,
        blueDriveScore: 0,
        blueTotalScore: 0,
        redTeamCount: 0,
        blueTeamCount: 0,
        redMultiplier: 1,
        blueMultiplier: 1,
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
    };

    beforeEach(() => {
      jest.clearAllMocks();
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
      prisma.match.create.mockImplementation(({ data }) => Promise.resolve({
        ...data,
        id: Math.random().toString(),
        stage: { name: 'Stage 1' },
        alliances: [],
      }) as any);
      prisma.matchScore.create.mockResolvedValue({
        id: 'score1',
        createdAt: new Date(),
        updatedAt: new Date(),
        scoreDetails: {},
        matchId: 'match1',
        redAutoScore: 0,
        redDriveScore: 0,
        redTotalScore: 0,
        blueAutoScore: 0,
        blueDriveScore: 0,
        blueTotalScore: 0,
        redTeamCount: 0,
        blueTeamCount: 0,
        redMultiplier: 1,
        blueMultiplier: 1,
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
      prisma.stage.findUnique.mockResolvedValue({
        ...baseStage,
        tournament: { ...baseStage.tournament, fields },
      } as any);
      prisma.match.create.mockImplementation(({ data }) => Promise.resolve({
        ...data,
        id: Math.random().toString(),
        stage: { name: 'Stage 1' },
        alliances: [],
      }) as any);
      prisma.matchScore.create.mockResolvedValue({
        id: 'score1',
        createdAt: new Date(),
        updatedAt: new Date(),
        scoreDetails: {},
        matchId: 'match1',
        redAutoScore: 0,
        redDriveScore: 0,
        redTotalScore: 0,
        blueAutoScore: 0,
        blueDriveScore: 0,
        blueTotalScore: 0,
        redTeamCount: 0,
        blueTeamCount: 0,
        redMultiplier: 1,
        blueMultiplier: 1,
      } as any);      // 16 teams, 1 round, 2 alliances per match = 4 matches
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
