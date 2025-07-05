import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('TeamsService', () => {
  let service: TeamsService;
  let prisma: DeepMockProxy<PrismaService>;

  const createMockTeam = (overrides: any = {}) => {
    const now = new Date();
    return {
      id: 'team1',
      name: 'Team 1',
      teamNumber: '000001',
      organization: null,
      avatar: null,
      description: null,
      teamLead: null,
      teamLeadId: null,
      teamMembers: [],
      tournamentId: 't1',
      currentStageId: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<TeamsService>(TeamsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a team with unique number', async () => {
      const team = createMockTeam();
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.findUnique.mockResolvedValue(null);
      prisma.team.create.mockResolvedValue(team as any);
      const dto = { name: 'Team 1', teamMembers: [], tournamentId: 't1' };
      const result = await service.create(dto as any);
      expect(result).toHaveProperty('id', 'team1');
      expect(prisma.team.create).toHaveBeenCalled();
    });
    
    it('should throw if team number is not unique', async () => {
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.findUnique.mockResolvedValue(createMockTeam({
        id: 'other',
        name: 'Other',
        teamNumber: '000002',
      }) as any);
      await expect(service.create({ name: 'Team 1', teamNumber: '000001' } as any)).rejects.toThrow(BadRequestException);
    });
    
    it('should throw BadRequestException on prisma error', async () => {
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.findUnique.mockResolvedValue(null);
      prisma.team.create.mockRejectedValue(new Error('Failed to create team: DB error'));
      await expect(service.create({ name: 'Team 1' } as any)).rejects.toThrow("Failed to create team: DB error");
    });
  });

  describe('findAll', () => {
    it('should return all teams', async () => {
      const team = createMockTeam();
      prisma.team.findMany.mockResolvedValue([team as any]);
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id', 'team1');
    });
    
    it('should filter by tournamentId', async () => {
      prisma.team.findMany.mockResolvedValue([createMockTeam({ tournamentId: 't1' }) as any]);
      const result = await service.findAll('t1');
      expect(result[0]).toHaveProperty('tournamentId', 't1');
    });
    
    it('should throw if prisma throws', async () => {
      prisma.team.findMany.mockRejectedValue(new Error('DB error'));
      await expect(service.findAll()).rejects.toThrow('DB error');
    });
  });

  describe('findOne', () => {
    it('should return a team by id', async () => {
      const team = createMockTeam();
      prisma.team.findUnique.mockResolvedValue(team as any);
      const result = await service.findOne('team1');
      expect(result).toHaveProperty('id', 'team1');
    });
    
    it('should throw NotFoundException if not found', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.findOne('notfound')).rejects.toThrow(NotFoundException);
    });
    
    it('should throw if prisma throws', async () => {
      prisma.team.findUnique.mockRejectedValue(new Error('DB error'));
      await expect(service.findOne('team1')).rejects.toThrow('DB error');
    });
  });

  describe('update', () => {
    it('should update a team', async () => {
      const team = createMockTeam();
      prisma.team.findUnique.mockResolvedValue(team as any);
      prisma.team.update.mockResolvedValue(createMockTeam({ name: 'Updated' }) as any);
      const result = await service.update('team1', { name: 'Updated' } as any);
      expect(result).toHaveProperty('id', 'team1');
      expect(prisma.team.update).toHaveBeenCalled();
    });
    
    it('should throw NotFoundException if team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.update('notfound', { name: 'fail' } as any)).rejects.toThrow(NotFoundException);
    });
    
    it('should throw BadRequestException on prisma error', async () => {
      const team = createMockTeam();
      prisma.team.findUnique.mockResolvedValue(team as any);
      prisma.team.update.mockRejectedValue(new Error('Failed to delete team: DB error'));
      await expect(service.update('team1', { name: 'fail' } as any)).rejects.toThrow("Failed to delete team: DB error");
    });
  });

  describe('remove', () => {
    it('should delete a team', async () => {
      const team = createMockTeam();
      prisma.team.findUnique.mockResolvedValue(team as any);
      prisma.team.delete.mockResolvedValue(team as any);
      const result = await service.remove('team1');
      expect(result).toHaveProperty('id', 'team1');
      expect(prisma.team.delete).toHaveBeenCalledWith({ where: { id: 'team1' } });
    });
    
    it('should throw NotFoundException if team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.remove('notfound')).rejects.toThrow(NotFoundException);
    });
    
    it('should throw BadRequestException on prisma error', async () => {
      const team = createMockTeam();
      prisma.team.findUnique.mockResolvedValue(team as any);
      prisma.team.delete.mockRejectedValue(new Error('Failed to delete team: DB error'));
      await expect(service.remove('team1')).rejects.toThrow('Failed to delete team: DB error');
    });
  });

  describe('importTeams', () => {
    it('should import teams from CSV', async () => {
      const team = createMockTeam();
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.findUnique.mockResolvedValue(null);
      prisma.team.create.mockResolvedValue(team as any);
      const dto = { content: 'Team 1,Org,Desc\nTeam 2,Org2,Desc2', format: 'csv', hasHeader: false, delimiter: ',', tournamentId: 't1' };
      const result = await service.importTeams(dto as any);
      expect(result.success).toBe(true);
      expect(result.teams.length).toBeGreaterThan(0);
    });
    
    it('should throw BadRequestException if no data', async () => {
      const dto = { content: '', format: 'csv', hasHeader: false, delimiter: ',' };
      await expect(service.importTeams(dto as any)).rejects.toThrow(BadRequestException);
    });
    
    it('should skip teams with errors and continue', async () => {
      const team = createMockTeam();
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.findUnique.mockResolvedValue(null);
      prisma.team.create.mockImplementationOnce(() => { throw new Error('fail'); });
      prisma.team.create.mockResolvedValue(createMockTeam({ id: 'team2', name: 'Team 2' }) as any);
      const dto = { content: 'Team 1,Org,Desc\nTeam 2,Org2,Desc2', format: 'csv', hasHeader: false, delimiter: ',' };
      const result = await service.importTeams(dto as any);
      expect(result.success).toBe(true);
      expect(result.teams.length).toBeGreaterThan(0);
    });
  });
});
