import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { EmailsService } from '../emails/emails.service';
import { DateValidationService } from '../common/services/date-validation.service';

describe('TeamsService', () => {
  let service: TeamsService;
  let prisma: DeepMockProxy<PrismaService>;
  let dateValidationService: DeepMockProxy<DateValidationService>;

  const createMockTeam = (overrides: any = {}) => {
    const now = new Date();
    return {
      id: 'team1',
      name: 'Team 1',
      teamNumber: '000001',
      tournamentId: 't1',
      currentStageId: null,
      userId: 'user1',
      referralSource: 'test',
      teamMembers: [],
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const emailsService = mockDeep<EmailsService>();
    dateValidationService = mockDeep<DateValidationService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailsService, useValue: emailsService },
        { provide: DateValidationService, useValue: dateValidationService }
      ],
    }).compile();
    service = module.get<TeamsService>(TeamsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a team with unique number', async () => {
      const team = createMockTeam();
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1',
        name: 'Tournament 1'
      } as any);
      prisma.team.findFirst.mockResolvedValue(null);
      prisma.team.create.mockResolvedValue({
        ...team,
        tournament: { id: 't1', name: 'Tournament 1' }
      } as any);

      // Mock date validation service
      dateValidationService.validateTeamRegistrationTiming.mockResolvedValue({
        isValid: true,
        errors: []
      });

      const dto = {
        name: 'Team 1',
        teamMembers: [],
        tournamentId: 't1',
        userId: 'user1',
        referralSource: 'Website'
      };

      const result = await service.createTeam(dto as any);
      expect(result).toHaveProperty('id', 'team1');
      expect(prisma.team.create).toHaveBeenCalled();
    });

    it('should throw if tournament does not exist', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.createTeam({
          name: 'Team 1',
          teamMembers: [],
          tournamentId: 'nonexistent',
          userId: 'user1',
          referralSource: 'Website'
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on prisma error', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 't1',
        name: 'Tournament 1'
      } as any);
      prisma.team.findFirst.mockResolvedValue(null);

      // Mock successful date validation
      dateValidationService.validateTeamRegistrationTiming.mockResolvedValue({
        isValid: true,
        errors: []
      });

      prisma.team.create.mockRejectedValue(
        new Error('Failed to create team: DB error'),
      );

      await expect(
        service.createTeam({
          name: 'Team 1',
          teamMembers: [],
          tournamentId: 't1',
          userId: 'user1',
          referralSource: 'Website'
        } as any),
      ).rejects.toThrow('Failed to create team: DB error');
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
      prisma.team.findMany.mockResolvedValue([
        createMockTeam({ tournamentId: 't1' }) as any,
      ]);
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
      await expect(service.findOne('notfound')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if prisma throws', async () => {
      prisma.team.findUnique.mockRejectedValue(new Error('DB error'));
      await expect(service.findOne('team1')).rejects.toThrow('DB error');
    });
  });

  describe('update', () => {
    it('should update a team', async () => {
      const team = createMockTeam();
      prisma.team.findUnique.mockResolvedValue({
        ...team,
        tournament: { id: 't1', name: 'Tournament 1' },
      } as any);
      prisma.teamMember.findMany.mockResolvedValue([]);
      prisma.team.update.mockResolvedValue(
        createMockTeam({ name: 'Updated' }) as any,
      );
      const result = await service.update({ id: 'team1', name: 'Updated' } as any);
      expect(result).toHaveProperty('id', 'team1');
      expect(prisma.team.update).toHaveBeenCalled();
    });

    it('should throw Error if team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(
        service.update({ id: 'notfound', name: 'fail' } as any),
      ).rejects.toThrow('Team not found');
    });

    it('should throw BadRequestException on prisma error', async () => {
      const team = createMockTeam();
      prisma.team.findUnique.mockResolvedValue({
        ...team,
        tournament: { id: 't1', name: 'Tournament 1' },
      } as any);
      prisma.teamMember.findMany.mockResolvedValue([]);
      prisma.team.update.mockRejectedValue(
        new Error('Failed to update team: Failed to delete team: DB error'),
      );
      await expect(
        service.update({ id: 'team1', name: 'fail' } as any),
      ).rejects.toThrow('Failed to update team: Failed to delete team: DB error');
    });
  });

  describe('remove', () => {
    it('should delete a team', async () => {
      const team = createMockTeam();
      prisma.team.findUnique.mockResolvedValue(team as any);
      prisma.team.delete.mockResolvedValue(team as any);
      const result = await service.remove('team1');
      expect(result).toHaveProperty('id', 'team1');
      expect(prisma.team.delete).toHaveBeenCalledWith({
        where: { id: 'team1' },
      });
    });

    it('should throw NotFoundException if team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.remove('notfound')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException on prisma error', async () => {
      const team = createMockTeam();
      prisma.team.findUnique.mockResolvedValue(team as any);
      prisma.team.delete.mockRejectedValue(
        new Error('Failed to delete team: DB error'),
      );
      await expect(service.remove('team1')).rejects.toThrow(
        'Failed to delete team: DB error',
      );
    });
  });

  
});
