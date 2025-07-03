import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('TeamsService', () => {
  let service: TeamsService;
  let prisma: DeepMockProxy<PrismaService>;

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
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.findUnique.mockResolvedValue(null);
      prisma.team.create.mockResolvedValue(team);
      const dto = { name: 'Team 1', teamMembers: [], tournamentId: 't1' };
      const result = await service.create(dto as any);
      expect(result).toHaveProperty('id', 'team1');
      expect(prisma.team.create).toHaveBeenCalled();
    });
    it('should throw if team number is not unique', async () => {
      const now = new Date();
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.findUnique.mockResolvedValue({
        id: 'other',
        name: 'Other',
        teamNumber: '000002',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      });
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
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findMany.mockResolvedValue([team]);
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id', 'team1');
    });
    it('should filter by tournamentId', async () => {
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findMany.mockResolvedValue([{ ...team, tournamentId: 't1' }]);
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
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findUnique.mockResolvedValue(team);
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
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findUnique.mockResolvedValue(team);
      prisma.team.update.mockResolvedValue({ ...team, name: 'Updated' });
      const result = await service.update('team1', { name: 'Updated' } as any);
      expect(result).toHaveProperty('id', 'team1');
      expect(prisma.team.update).toHaveBeenCalled();
    });
    it('should throw NotFoundException if team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.update('notfound', { name: 'fail' } as any)).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException on prisma error', async () => {
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findUnique.mockResolvedValue(team);
      prisma.team.update.mockRejectedValue(new Error('Failed to delete team: DB error'));
      await expect(service.update('team1', { name: 'fail' } as any)).rejects.toThrow("Failed to delete team: DB error");
    });
  });

  describe('remove', () => {
    it('should delete a team', async () => {
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findUnique.mockResolvedValue(team);
      prisma.team.delete.mockResolvedValue(team);
      const result = await service.remove('team1');
      expect(result).toHaveProperty('id', 'team1');
      expect(prisma.team.delete).toHaveBeenCalledWith({ where: { id: 'team1' } });
    });
    it('should throw NotFoundException if team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.remove('notfound')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException on prisma error', async () => {
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findUnique.mockResolvedValue(team);
      prisma.team.delete.mockRejectedValue(new Error('Failed to delete team: DB error'));
      await expect(service.remove('team1')).rejects.toThrow('Failed to delete team: DB error');
    });
  });

  describe('importTeams', () => {
    it('should import teams from CSV', async () => {
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.findUnique.mockResolvedValue(null);
      prisma.team.create.mockResolvedValue(team);
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
      const now = new Date();
      const team = {
        id: 'team1',
        name: 'Team 1',
        teamNumber: '000001',
        organization: null,
        avatar: null,
        description: null,
        teamMembers: [],
        tournamentId: 't1',
        createdAt: now,
        updatedAt: now,
      };
      prisma.team.findMany.mockResolvedValue([]);
      prisma.team.findUnique.mockResolvedValue(null);
      prisma.team.create.mockImplementationOnce(() => { throw new Error('fail'); });
      prisma.team.create.mockResolvedValue({ ...team, id: 'team2', name: 'Team 2' });
      const dto = { content: 'Team 1,Org,Desc\nTeam 2,Org2,Desc2', format: 'csv', hasHeader: false, delimiter: ',' };
      const result = await service.importTeams(dto as any);
      expect(result.success).toBe(true);
      expect(result.teams.length).toBeGreaterThan(0);
    });
  });
});
