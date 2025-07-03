import { Test, TestingModule } from '@nestjs/testing';
import { MatchScoresService } from './match-scores.service';
import { PrismaService } from '../prisma.service';
import { TeamStatsService } from './team-stats.service';
import { BadRequestException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Mock for MatchSchedulerService
class MockMatchSchedulerService {}

describe('MatchScoresService', () => {
  let service: MatchScoresService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchScoresService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'MatchSchedulerService', useClass: MockMatchSchedulerService },
        { provide: require('./../match-scheduler/match-scheduler.service').MatchSchedulerService, useClass: MockMatchSchedulerService },
      ],
    }).compile();
    service = module.get<MatchScoresService>(MatchScoresService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw if matchId is missing', async () => {
      await expect(service.create({} as any)).rejects.toBeDefined();
    });
    it('should throw if match does not exist', async () => {
      prisma.match.findUnique.mockResolvedValueOnce(null);
      await expect(service.create({ matchId: 'm1' } as any)).rejects.toBeDefined();
    });
    it('should throw if match scores already exist', async () => {
      prisma.match.findUnique.mockResolvedValueOnce({ id: 'm1' } as any);
      prisma.matchScores.findUnique.mockResolvedValueOnce({ id: 's1' } as any);
      await expect(service.create({ matchId: 'm1' } as any)).rejects.toBeDefined();
    });
    it('should create match scores and update match', async () => {
      prisma.match.findUnique.mockResolvedValueOnce({ id: 'm1' } as any);
      prisma.matchScores.findUnique.mockResolvedValueOnce(null);
      prisma.matchScores.create.mockResolvedValue({ id: 's1', matchId: 'm1' } as any);
      prisma.match.update.mockResolvedValue({} as any);
      prisma.match.findUnique.mockResolvedValueOnce({ id: 'm1', alliances: [], stage: { tournament: {} } } as any);
      const dto = { matchId: 'm1', redAutoScore: 10, blueAutoScore: 5 };
      const result = await service.create(dto as any);
      expect(result).toHaveProperty('id', 's1');
      expect(prisma.matchScores.create).toHaveBeenCalled();
      expect(prisma.match.update).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all match scores', async () => {
      prisma.matchScores.findMany.mockResolvedValue([{ id: 's1', match: {} } as any]);
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a match score by id', async () => {
      prisma.matchScores.findUnique.mockResolvedValue({ id: 's1', match: {} } as any);
      const result = await service.findOne('s1');
      expect(result).toHaveProperty('id', 's1');
    });
    it('should throw if not found', async () => {
      prisma.matchScores.findUnique.mockResolvedValue(null);
      await expect(service.findOne('notfound')).rejects.toBeDefined();
    });
  });

  describe('update', () => {
    it('should throw if not found', async () => {
      prisma.matchScores.findUnique.mockResolvedValue(null);
      await expect(service.update('notfound', {} as any)).rejects.toBeDefined();
    });
    
    it('should update match scores', async () => {
      // Mock the existing scores that would be found
      prisma.matchScores.findUnique.mockResolvedValue({
        id: 's1',
        matchId: 'm1',
        redAutoScore: 20,
        redDriveScore: 30,
        redTotalScore: 50,
        blueAutoScore: 15,
        blueDriveScore: 25,
        blueTotalScore: 40,
        redTeamCount: 2,
        blueTeamCount: 2,
        redMultiplier: 1.0,
        blueMultiplier: 1.0,
        match: { 
          id: 'm1', 
          stageId: 'st1', 
          stage: { 
            tournamentId: 't1' 
          } 
        }
      } as any);
      
      // Mock the transaction function
      prisma.$transaction.mockImplementation(async (callback) => {
        // Mock the update function inside the transaction
        prisma.matchScores.update.mockResolvedValue({
          id: 's1',
          matchId: 'm1',
          redAutoScore: 50,
          redDriveScore: 30,
          redTotalScore: 80,
          blueAutoScore: 15,
          blueDriveScore: 25,
          blueTotalScore: 40,
          redTeamCount: 2,
          blueTeamCount: 2,
          redMultiplier: 1.0,
          blueMultiplier: 1.0,
        } as any);
        
        return callback(prisma);
      });
      
      // Mock the complete match look up after updating scores
      prisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        alliances: [],
        stage: { 
          id: 'st1',
          tournament: { 
            id: 't1' 
          } 
        }
      } as any);

      const result = await service.update('s1', { redAutoScore: 50 } as any);
      expect(result).toHaveProperty('id', 's1');
      expect(prisma.matchScores.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw if not found', async () => {
      prisma.matchScores.findUnique.mockResolvedValue(null);
      await expect(service.remove('notfound')).rejects.toBeDefined();
    });
    it('should delete match scores', async () => {
      prisma.matchScores.findUnique.mockResolvedValue({ id: 's1', match: { id: 'm1', stageId: 'st1', stage: { tournamentId: 't1' } } } as any);
      prisma.matchScores.delete.mockResolvedValue({ id: 's1' } as any);
      const result = await service.remove('s1');
      expect(result).toHaveProperty('id', 's1');
      expect(prisma.matchScores.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });
  });
});

describe('TeamStatsService', () => {
  let service: TeamStatsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    service = new TeamStatsService(prisma as any);
    jest.clearAllMocks();
  });

  it('should do nothing if no match or teamIds', async () => {
    await expect(service.recalculateTeamStats(null as any, [])).resolves.toBeUndefined();
  });

  it('should recalculate stats for teams', async () => {
    prisma.match.findMany.mockResolvedValue([
      {
        id: 'm1',
        alliances: [
          { color: 'RED', teamAlliances: [{ teamId: 't1' }] },
          { color: 'BLUE', teamAlliances: [{ teamId: 't2' }] },
        ],
        winningAlliance: 'RED',
      },
      {
        id: 'm2',
        alliances: [
          { color: 'RED', teamAlliances: [{ teamId: 't1' }] },
          { color: 'BLUE', teamAlliances: [{ teamId: 't2' }] },
        ],
        winningAlliance: 'TIE',
      },
    ] as any);
    prisma.teamStats.upsert.mockResolvedValue({} as any);
    const match = { stage: { tournament: { id: 'tournament1' } } } as any;
    await expect(service.recalculateTeamStats(match, ['t1', 't2'])).resolves.toBeUndefined();
    expect(prisma.match.findMany).toHaveBeenCalled();
    expect(prisma.teamStats.upsert).toHaveBeenCalled();
  });
});
