import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DateValidationService } from './date-validation.service';
import { PrismaService } from '../../prisma.service';

describe('DateValidationService', () => {
  let service: DateValidationService;
  let prismaService: PrismaService;

  const mockTournament = {
    id: 'tournament-1',
    name: 'Test Tournament',
    description: null,
    startDate: new Date('2024-06-01T09:00:00Z'),
    endDate: new Date('2024-06-03T18:00:00Z'),
    registrationDeadline: new Date('2024-05-30T23:59:59Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    adminId: 'admin-1',
    numberOfFields: 2,
    maxTeams: null,
    maxTeamMembers: null,
    minTeamMembers: null
  };

  const mockStage = {
    id: 'stage-1',
    name: 'Qualification',
    description: null,
    type: 'QUALIFICATION' as any,
    status: 'ACTIVE' as any,
    startDate: new Date('2024-06-01T10:00:00Z'),
    endDate: new Date('2024-06-02T17:00:00Z'),
    tournamentId: 'tournament-1',
    teamsPerAlliance: 2,
    maxTeams: null,
    isElimination: false,
    advancementRules: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMatch = {
    id: 'match-1',
    matchNumber: 1,
    status: 'PENDING' as any,
    startTime: new Date('2024-06-01T10:30:00Z'),
    endTime: new Date('2024-06-01T11:00:00Z'),
    stageId: 'stage-1',
    updatedAt: new Date(),
    roundNumber: null,
    scheduledTime: null,
    duration: null,
    fieldId: null,
    fieldNumber: null,
    scoredById: null,
    matchType: 'QUALIFICATION' as any,
    matchDuration: null,
    winningAlliance: null,
    roundType: null,
    scheduleId: null
  };

  const mockTeam = {
    id: 'team-1',
    name: 'Test Team',
    tournamentId: 'tournament-1',
    createdAt: new Date('2024-05-29T10:00:00Z'),
    updatedAt: new Date(),
    teamNumber: '000001',
    currentStageId: null,
    userId: 'user-1',
    referralSource: 'test'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DateValidationService,
        {
          provide: PrismaService,
          useValue: {
            tournament: {
              findUnique: jest.fn(),
            },
            stage: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            match: {
              findMany: jest.fn(),
            },
            team: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DateValidationService>(DateValidationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('validateTournamentDateRange', () => {
    it('should validate successfully when no existing stages', async () => {
      jest.spyOn(prismaService.stage, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.team, 'findMany').mockResolvedValue([]);

      const result = await service.validateTournamentDateRange(
        { startDate: mockTournament.startDate, endDate: mockTournament.endDate },
        { tournamentId: mockTournament.id }
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when existing stage falls outside new tournament range', async () => {
      const existingStage = {
        ...mockStage,
        startDate: new Date('2024-05-30T10:00:00Z'), // Before tournament start
        endDate: new Date('2024-06-01T17:00:00Z')
      };

      jest.spyOn(prismaService.stage, 'findMany').mockResolvedValue([existingStage]);
      jest.spyOn(prismaService.team, 'findMany').mockResolvedValue([]);

      const result = await service.validateTournamentDateRange(
        { startDate: mockTournament.startDate, endDate: mockTournament.endDate },
        { tournamentId: mockTournament.id }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('falls outside the new tournament date range')
      )).toBe(true);
    });

    it('should validate team registration dates', async () => {
      const teamRegisteredAfterTournament = {
        ...mockTeam,
        name: 'Late Team',
        createdAt: new Date('2024-06-04T10:00:00Z') // After tournament end
      };

      jest.spyOn(prismaService.stage, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.team, 'findMany').mockResolvedValue([teamRegisteredAfterTournament]);

      const result = await service.validateTournamentDateRange(
        { startDate: mockTournament.startDate, endDate: mockTournament.endDate },
        { tournamentId: mockTournament.id }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('was registered outside the new tournament date range')
      )).toBe(true);
    });
  });

  describe('validateStageeDateRange', () => {
    it('should validate successfully when stage is within tournament bounds', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament);
      jest.spyOn(prismaService.match, 'findMany').mockResolvedValue([]);

      const result = await service.validateStageeDateRange(
        { startDate: mockStage.startDate, endDate: mockStage.endDate },
        { stageId: mockStage.id, tournamentId: mockTournament.id }
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when stage extends beyond tournament bounds', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament);
      jest.spyOn(prismaService.match, 'findMany').mockResolvedValue([]);

      const invalidStageRange = {
        startDate: new Date('2024-06-01T10:00:00Z'),
        endDate: new Date('2024-06-04T17:00:00Z') // After tournament end
      };

      const result = await service.validateStageeDateRange(
        invalidStageRange,
        { stageId: mockStage.id, tournamentId: mockTournament.id }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('must fall within tournament dates')
      )).toBe(true);
    });

    it('should fail when existing matches fall outside new stage range', async () => {
      const existingMatch = {
        ...mockMatch,
        startTime: new Date('2024-06-01T08:00:00Z'), // Before stage start
        endTime: new Date('2024-06-01T08:30:00Z')
      };

      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament);
      jest.spyOn(prismaService.match, 'findMany').mockResolvedValue([existingMatch]);

      const newStageRange = {
        startDate: new Date('2024-06-01T10:00:00Z'),
        endDate: new Date('2024-06-02T17:00:00Z')
      };

      const result = await service.validateStageeDateRange(
        newStageRange,
        { stageId: mockStage.id, tournamentId: mockTournament.id }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('is scheduled before the new stage start date')
      )).toBe(true);
    });
  });

  describe('validateMatchDateRange', () => {
    it('should validate successfully when match is within stage bounds', async () => {
      jest.spyOn(prismaService.stage, 'findUnique').mockResolvedValue({
        ...mockStage,
        tournament: mockTournament
      } as any);

      const result = await service.validateMatchDateRange(
        { startDate: mockMatch.startTime!, endDate: mockMatch.endTime! },
        mockStage.id
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when match extends beyond stage bounds', async () => {
      jest.spyOn(prismaService.stage, 'findUnique').mockResolvedValue({
        ...mockStage,
        tournament: mockTournament
      } as any);

      const invalidMatchRange = {
        startDate: new Date('2024-06-01T10:30:00Z'),
        endDate: new Date('2024-06-03T11:00:00Z') // After stage end
      };

      const result = await service.validateMatchDateRange(
        invalidMatchRange,
        mockStage.id
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('must fall within stage dates')
      )).toBe(true);
    });
  });

  describe('validateTeamRegistrationTiming', () => {
    it('should validate successful registration before tournament end', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament);

      const registrationDate = new Date('2024-05-29T10:00:00Z');
      const result = await service.validateTeamRegistrationTiming(
        registrationDate,
        mockTournament.id
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when registration is after tournament end', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament);

      const registrationDate = new Date('2024-06-04T10:00:00Z'); // After tournament end
      const result = await service.validateTeamRegistrationTiming(
        registrationDate,
        mockTournament.id
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('cannot be after tournament end date')
      )).toBe(true);
    });
  });

  describe('canUpdateTournamentDates', () => {
    it('should allow update when no active matches', async () => {
      jest.spyOn(prismaService.match, 'findMany')
        .mockResolvedValueOnce([]) // No active matches
        .mockResolvedValueOnce([]); // No completed matches outside range

      const result = await service.canUpdateTournamentDates(
        mockTournament.id,
        { startDate: mockTournament.startDate, endDate: mockTournament.endDate }
      );

      expect(result.canUpdate).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('should block update when active matches exist', async () => {
      const activeMatch = {
        ...mockMatch,
        status: 'IN_PROGRESS' as any
      };

      jest.spyOn(prismaService.match, 'findMany')
        .mockResolvedValueOnce([activeMatch] as any) // Active matches exist
        .mockResolvedValueOnce([]); // No completed matches outside range

      const result = await service.canUpdateTournamentDates(
        mockTournament.id,
        { startDate: mockTournament.startDate, endDate: mockTournament.endDate }
      );

      expect(result.canUpdate).toBe(false);
      expect(result.blockers.some(blocker =>
        blocker.includes('matches are currently active')
      )).toBe(true);
    });
  });

  describe('getDateBoundaries', () => {
    it('should return tournament and stage boundaries', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament);
      jest.spyOn(prismaService.stage, 'findUnique').mockResolvedValue(mockStage);

      const result = await service.getDateBoundaries(mockTournament.id, mockStage.id);

      expect(result.tournament).toEqual({
        startDate: mockTournament.startDate,
        endDate: mockTournament.endDate
      });
      expect(result.stage).toEqual({
        startDate: mockStage.startDate,
        endDate: mockStage.endDate
      });
      expect(result.warnings).toBeDefined();
    });

    it('should add warnings for tournaments that have started', async () => {
      const startedTournament = {
        ...mockTournament,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Started yesterday
      };

      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(startedTournament);

      const result = await service.getDateBoundaries(mockTournament.id);

      expect(result.warnings.some(warning =>
        warning.includes('Tournament has already started')
      )).toBe(true);
    });
  });
});
