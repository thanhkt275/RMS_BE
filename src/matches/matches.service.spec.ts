import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { PrismaService } from '../prisma.service';
import { MatchScoresService } from '../match-scores/match-scores.service';
import { MatchChangeDetectionService } from './match-change-detection.service';
import { DateValidationService } from '../common/services/date-validation.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { MatchState, MatchType, AllianceColor } from '../utils/prisma-types';

// Helper function to create mock match with all required fields
function createMockMatch(overrides: Partial<any> = {}) {
  const now = new Date();
  return {
    id: 'match1',
    matchNumber: 1,
    roundNumber: 1,
    status: MatchState.PENDING,
    startTime: null,
    scheduledTime: null,
    endTime: null,
    duration: null,
    winningAlliance: null,
    stageId: 'stage1',
    scoredById: null,
    roundType: null,
    scheduleId: null,
    fieldId: null,
    matchType: MatchType.FULL,
    matchDuration: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Helper function to create mock alliance with all required fields
function createMockAlliance(overrides: Partial<any> = {}) {
  const now = new Date();
  return {
    id: 'alliance1',
    color: AllianceColor.RED,
    score: 0,
    matchId: 'match1',
    autoScore: 0,
    driveScore: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('MatchesController', () => {
  let app: INestApplication;
  let matchesService: MatchesService;
  let prisma: DeepMockProxy<PrismaService>;
  let matchScoresService: DeepMockProxy<MatchScoresService>;
  let matchChangeDetectionService: DeepMockProxy<MatchChangeDetectionService>;
  let dateValidationService: DeepMockProxy<DateValidationService>;

  beforeAll(async () => {
    prisma = mockDeep<PrismaService>();
    matchScoresService = mockDeep<MatchScoresService>();
    matchChangeDetectionService = mockDeep<MatchChangeDetectionService>();
    dateValidationService = mockDeep<DateValidationService>();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MatchScoresService, useValue: matchScoresService },
        { provide: MatchChangeDetectionService, useValue: matchChangeDetectionService },
        { provide: DateValidationService, useValue: dateValidationService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    matchesService = moduleRef.get<MatchesService>(MatchesService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock date validation service to return valid by default
    dateValidationService.validateMatchDateRange.mockResolvedValue({
      isValid: true,
      errors: []
    });
  });

  it('should be defined', () => {
    expect(matchesService).toBeDefined();
  });

  describe('create', () => {
    it('should create a match and alliances', async () => {
      prisma.match.create.mockResolvedValue({ id: 'match1', alliances: [] } as any);
      prisma.alliance.create.mockResolvedValue({ id: 'alliance1' } as any);
      prisma.teamAlliance.create.mockResolvedValue({} as any);
      prisma.match.findUnique.mockResolvedValue({ id: 'match1', alliances: [] } as any);

      const dto = {
        matchNumber: 1,
        status: 'PENDING',
        stageId: 'stage1',
        alliances: [
          { color: 'RED', teamIds: ['team1', 'team2'] },
          { color: 'BLUE', teamIds: ['team3', 'team4'] },
        ],
      };

      const result = await matchesService.create(dto as any);
      expect(result).toHaveProperty('id', 'match1');
      expect(prisma.match.create).toHaveBeenCalled();
      expect(prisma.alliance.create).toHaveBeenCalledTimes(2);
      expect(prisma.teamAlliance.create).toHaveBeenCalledTimes(4);
    });
  });

  describe('findAll', () => {
    it('should return all matches', async () => {
      prisma.match.findMany.mockResolvedValue([{ id: 'match1' } as any]);
      const result = await matchesService.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id', 'match1');
    });
  });

  describe('findOne', () => {
    it('should return a match by id', async () => {
      prisma.match.findUnique.mockResolvedValue({ id: 'match1' } as any);
      const result = await matchesService.findOne('match1');
      expect(result).toHaveProperty('id', 'match1');
    });
  });

  describe('update', () => {
    it('should update a match', async () => {
      prisma.match.update.mockResolvedValue({ id: 'match1', alliances: [] } as any);
      const result = await matchesService.update('match1', { matchNumber: 2 } as any);
      expect(result).toHaveProperty('id', 'match1');
      expect(prisma.match.update).toHaveBeenCalled();
    });

    it('should update fieldId and set fieldNumber from Field', async () => {
      prisma.field.findUnique.mockResolvedValue({ number: 42 } as any);
      prisma.match.update.mockResolvedValue({ id: 'match1', fieldId: 'field1', fieldNumber: 42, alliances: [] } as any);
      const result = await matchesService.update('match1', { fieldId: 'field1' } as any);
      expect(prisma.field.findUnique).toHaveBeenCalledWith({ where: { id: 'field1' }, select: { number: true } });
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match1' },
        data: { fieldId: 'field1', fieldNumber: 42 },
        include: {
          alliances: true,
          field: {
            include: {
              fieldReferees: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      role: true
                    }
                  }
                }
              }
            }
          },
          scoredBy: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        },
      });
      expect(result).toHaveProperty('fieldNumber', 42);
    });

    it('should update fieldNumber directly if provided', async () => {
      prisma.match.update.mockResolvedValue({ id: 'match1', fieldNumber: 99, alliances: [] } as any);
      const result = await matchesService.update('match1', { fieldNumber: 99 } as any);
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match1' },
        data: { fieldNumber: 99 },
        include: { alliances: true },
      });
      expect(result).toHaveProperty('fieldNumber', 99);
    });

    it('should throw if fieldId is not found', async () => {
      prisma.field.findUnique.mockResolvedValue(null);
      await expect(matchesService.update('match1', { fieldId: 'badid' } as any)).rejects.toThrow('Field not found');
    });

    it('should update matchType', async () => {
      prisma.match.update.mockResolvedValue({ id: 'match1', matchType: 'TELEOP_ENDGAME', alliances: [] } as any);
      const result = await matchesService.update('match1', { matchType: 'TELEOP_ENDGAME' } as any);
      expect(result).toHaveProperty('matchType', 'TELEOP_ENDGAME');
      expect(prisma.match.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'match1' },
        data: expect.objectContaining({ matchType: 'TELEOP_ENDGAME' }),
        include: { alliances: true },
      }));
    });
  });

  describe('remove', () => {
    it('should delete a match', async () => {
      prisma.match.delete.mockResolvedValue({ id: 'match1' } as any);
      const result = await matchesService.remove('match1');
      expect(result).toHaveProperty('id', 'match1');
      expect(prisma.match.delete).toHaveBeenCalledWith({ where: { id: 'match1' } });
    });
  });

  describe('assignMatchToField', () => {
    const mockHeadReferee = {
      id: 'fr1',
      fieldId: 'field1',
      userId: 'headref1',
      isHeadRef: true,
      createdAt: new Date()
    };

    const mockUpdatedMatch = {
      id: 'match1',
      matchNumber: 1,
      status: 'PENDING',
      fieldId: 'field1',
      scoredById: 'headref1',
      field: {
        id: 'field1',
        name: 'Field 1',
        number: 1,
        fieldReferees: [
          {
            id: 'fr1',
            isHeadRef: true,
            user: {
              id: 'headref1',
              username: 'headref',
              role: 'HEAD_REFEREE'
            }
          }
        ]
      },
      scoredBy: {
        id: 'headref1',
        username: 'headref',
        role: 'HEAD_REFEREE'
      }
    };

    it('should assign match to field and auto-assign head referee as scorer', async () => {
      prisma.fieldReferee.findFirst.mockResolvedValue(mockHeadReferee as any);
      prisma.match.update.mockResolvedValue(mockUpdatedMatch as any);

      const result = await matchesService.assignMatchToField('match1', 'field1');

      expect(result).toEqual(mockUpdatedMatch);
      expect(prisma.fieldReferee.findFirst).toHaveBeenCalledWith({
        where: {
          fieldId: 'field1',
          isHeadRef: true,
        },
      });
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match1' },
        data: {
          fieldId: 'field1',
          scoredById: 'headref1',
        },
        include: {
          field: {
            include: {
              fieldReferees: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      role: true
                    }
                  }
                }
              }
            }
          },
          scoredBy: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      });
    });

    it('should throw error when no head referee is assigned to field', async () => {
      prisma.fieldReferee.findFirst.mockResolvedValue(null);

      await expect(
        matchesService.assignMatchToField('match1', 'field1')
      ).rejects.toThrow('No head referee assigned to field field1');

      expect(prisma.fieldReferee.findFirst).toHaveBeenCalledWith({
        where: {
          fieldId: 'field1',
          isHeadRef: true,
        },
      });
      // Should not call update since head referee lookup failed
      expect(prisma.match.update).toHaveBeenCalledTimes(0);
    });

    it('should handle prisma errors gracefully', async () => {
      prisma.fieldReferee.findFirst.mockResolvedValue(mockHeadReferee as any);
      prisma.match.update.mockRejectedValue(new Error('Database error'));

      await expect(
        matchesService.assignMatchToField('match1', 'field1')
      ).rejects.toThrow('Database error');
    });
  });

  describe('update with auto head referee assignment', () => {
    const mockHeadReferee = {
      id: 'fr1',
      fieldId: 'field1',
      userId: 'headref1',
      isHeadRef: true
    };

    const mockField = {
      id: 'field1',
      number: 1,
      name: 'Field 1'
    };

    const mockUpdatedMatch = {
      id: 'match1',
      fieldId: 'field1',
      scoredById: 'headref1',
      matchNumber: 1,
      status: 'PENDING'
    };

    it('should auto-assign head referee when fieldId is updated and no scoredById provided', async () => {
      const updateDto = { fieldId: 'field1' };
      
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      prisma.fieldReferee.findFirst.mockResolvedValue(mockHeadReferee as any);
      prisma.match.update.mockResolvedValue(mockUpdatedMatch as any);

      const result = await matchesService.update('match1', updateDto as any);

      expect(result).toEqual(mockUpdatedMatch);
      expect(prisma.field.findUnique).toHaveBeenCalledWith({
        where: { id: 'field1' },
        select: { number: true },
      });
      expect(prisma.fieldReferee.findFirst).toHaveBeenCalledWith({
        where: {
          fieldId: 'field1',
          isHeadRef: true,
        },
      });
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match1' },
        data: {
          fieldId: 'field1',
          fieldNumber: 1,
          scoredById: 'headref1'
        },
        include: expect.any(Object)
      });
    });

    it('should not override existing scoredById when explicitly provided', async () => {
      const updateDto = { fieldId: 'field1', scoredById: 'existing-scorer' };
      
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      prisma.match.update.mockResolvedValue({ ...mockUpdatedMatch, scoredById: 'existing-scorer' } as any);

      await matchesService.update('match1', updateDto as any);

      // Should still call field.findUnique to get field number
      expect(prisma.field.findUnique).toHaveBeenCalledWith({
        where: { id: 'field1' },
        select: { number: true },
      });
      // Should not call fieldReferee.findFirst since scoredById is provided
      expect(prisma.fieldReferee.findFirst).toHaveBeenCalledTimes(0);
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match1' },
        data: { 
          fieldId: 'field1',
          fieldNumber: 1,
          scoredById: 'existing-scorer'
        },
        include: expect.any(Object)
      });
    });

    it('should not assign head referee when fieldId is not being updated', async () => {
      const updateDto = { status: 'IN_PROGRESS' };
      
      prisma.match.update.mockResolvedValue({ id: 'match1', status: 'IN_PROGRESS' } as any);

      await matchesService.update('match1', updateDto as any);

      // Should not call field lookup or head referee lookup since fieldId is not being updated
      expect(prisma.field.findUnique).toHaveBeenCalledTimes(0);
      expect(prisma.fieldReferee.findFirst).toHaveBeenCalledTimes(0);
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match1' },
        data: { status: 'IN_PROGRESS' },
        include: {
          alliances: true,
        }
      });
    });

    it('should handle case when field is not found', async () => {
      const updateDto = { fieldId: 'nonexistent-field' };
      
      prisma.field.findUnique.mockResolvedValue(null);

      await expect(matchesService.update('match1', updateDto as any)).rejects.toThrow('Field not found');
    });

    it('should handle case when no head referee exists for field', async () => {
      const updateDto = { fieldId: 'field1' };
      
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      prisma.fieldReferee.findFirst.mockResolvedValue(null);
      prisma.match.update.mockResolvedValue({ ...mockUpdatedMatch, scoredById: null } as any);

      await matchesService.update('match1', updateDto as any);

      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match1' },
        data: { 
          fieldId: 'field1',
          fieldNumber: 1
        },
        include: expect.any(Object)
      });
    });
  });
});
