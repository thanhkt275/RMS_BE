import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScoreConfigResolutionService, ScoreConfigWithDetails, ValidationResult } from './score-config-resolution.service';
import { PrismaService } from '../prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('ScoreConfigResolutionService', () => {
  let service: ScoreConfigResolutionService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreConfigResolutionService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<ScoreConfigResolutionService>(ScoreConfigResolutionService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache(); // Clear cache between tests
  });

  describe('resolveScoreConfigForMatch', () => {
    const mockMatch = {
      id: 'match-1',
      stage: {
        id: 'stage-1',
        tournament: {
          id: 'tournament-1',
          name: 'Test Tournament',
        },
      },
    };

    const mockScoreConfig: ScoreConfigWithDetails = {
      id: 'config-1',
      name: 'Test Config',
      description: 'Test score configuration',
      tournamentId: 'tournament-1',
      totalScoreFormula: 'auto + teleop',
      createdAt: new Date(),
      updatedAt: new Date(),
      scoreSections: [
        {
          id: 'section-1',
          name: 'Auto',
          code: 'auto',
          description: 'Autonomous period',
          displayOrder: 1,
          scoreConfigId: 'config-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          scoreElements: [
            {
              id: 'element-1',
              name: 'Auto Cones',
              code: 'auto_cones',
              description: 'Cones scored in auto',
              pointsPerUnit: 6,
              category: 'auto',
              elementType: 'COUNTER' as any,
              displayOrder: 1,
              icon: null,
              color: null,
              scoreConfigId: 'config-1',
              scoreSectionId: 'section-1',
            },
          ],
          bonusConditions: [],
          penaltyConditions: [],
        },
      ],
      scoreElements: [],
      bonusConditions: [],
      penaltyConditions: [],
    };

    it('should resolve score config for a match successfully', async () => {
      prisma.match.findUnique.mockResolvedValue(mockMatch as any);
      prisma.scoreConfig.findFirst.mockResolvedValue(mockScoreConfig as any);

      const result = await service.resolveScoreConfigForMatch('match-1');

      expect(result).toEqual(mockScoreConfig);
      expect(prisma.match.findUnique).toHaveBeenCalledWith({
        where: { id: 'match-1' },
        include: {
          stage: {
            include: {
              tournament: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      expect(prisma.scoreConfig.findFirst).toHaveBeenCalledWith({
        where: { tournamentId: 'tournament-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when match is not found', async () => {
      prisma.match.findUnique.mockResolvedValue(null);

      await expect(service.resolveScoreConfigForMatch('non-existent-match')).rejects.toThrow(
        new NotFoundException('Match with ID non-existent-match not found')
      );
    });

    it('should return null when match has no tournament', async () => {
      const matchWithoutTournament = {
        id: 'match-1',
        stage: null,
      };
      prisma.match.findUnique.mockResolvedValue(matchWithoutTournament as any);

      const result = await service.resolveScoreConfigForMatch('match-1');

      expect(result).toBeNull();
    });

    it('should return null when no score config is found for tournament', async () => {
      prisma.match.findUnique.mockResolvedValue(mockMatch as any);
      prisma.scoreConfig.findFirst.mockResolvedValue(null);

      const result = await service.resolveScoreConfigForMatch('match-1');

      expect(result).toBeNull();
    });

    it('should use cached result when available', async () => {
      prisma.match.findUnique.mockResolvedValue(mockMatch as any);
      prisma.scoreConfig.findFirst.mockResolvedValue(mockScoreConfig as any);

      // First call - should query database
      await service.resolveScoreConfigForMatch('match-1');
      
      // Second call - should use cache
      const result = await service.resolveScoreConfigForMatch('match-1');

      expect(result).toEqual(mockScoreConfig);
      expect(prisma.match.findUnique).toHaveBeenCalledTimes(2); // Match lookup not cached
      expect(prisma.scoreConfig.findFirst).toHaveBeenCalledTimes(1); // Score config lookup cached
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      prisma.match.findUnique.mockRejectedValue(dbError);

      await expect(service.resolveScoreConfigForMatch('match-1')).rejects.toThrow(dbError);
    });
  });

  describe('getScoreConfigWithPreview', () => {
    const mockScoreConfig: ScoreConfigWithDetails = {
      id: 'config-1',
      name: 'Test Config',
      description: 'Test score configuration',
      tournamentId: 'tournament-1',
      totalScoreFormula: 'auto + teleop',
      createdAt: new Date(),
      updatedAt: new Date(),
      scoreSections: [
        {
          id: 'section-1',
          name: 'Auto',
          code: 'auto',
          description: 'Autonomous period',
          displayOrder: 1,
          scoreConfigId: 'config-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          scoreElements: [
            {
              id: 'element-1',
              name: 'Auto Cones',
              code: 'auto_cones',
              description: 'Cones scored in auto',
              pointsPerUnit: 6,
              category: 'auto',
              elementType: 'COUNTER' as any,
              displayOrder: 1,
              icon: null,
              color: null,
              scoreConfigId: 'config-1',
              scoreSectionId: 'section-1',
            },
          ],
          bonusConditions: [],
          penaltyConditions: [],
        },
        {
          id: 'section-2',
          name: 'Teleop',
          code: 'teleop',
          description: 'Teleoperated period',
          displayOrder: 2,
          scoreConfigId: 'config-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          scoreElements: [],
          bonusConditions: [],
          penaltyConditions: [],
        },
      ],
      scoreElements: [],
      bonusConditions: [],
      penaltyConditions: [],
    };

    it('should return score config with validation', async () => {
      prisma.scoreConfig.findUnique.mockResolvedValue(mockScoreConfig as any);

      const result = await service.getScoreConfigWithPreview('config-1');

      expect(result.config).toEqual(mockScoreConfig);
      expect(result.validation).toEqual({
        isValid: true,
        errors: [],
        warnings: [],
      });
    });

    it('should throw NotFoundException when score config is not found', async () => {
      prisma.scoreConfig.findUnique.mockResolvedValue(null);

      await expect(service.getScoreConfigWithPreview('non-existent-config')).rejects.toThrow(
        new NotFoundException('Score config with ID non-existent-config not found')
      );
    });

    it('should validate score config and return errors', async () => {
      const invalidConfig = {
        ...mockScoreConfig,
        scoreSections: [], // No sections or elements
        scoreElements: [],
      };
      prisma.scoreConfig.findUnique.mockResolvedValue(invalidConfig as any);

      const result = await service.getScoreConfigWithPreview('config-1');

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toContain(
        'Score configuration must have either score elements or score sections with elements'
      );
    });
  });

  describe('validateScoreConfigForTournament', () => {
    const mockScoreConfig = {
      id: 'config-1',
      name: 'Test Config',
      tournamentId: null,
      scoreSections: [
        {
          id: 'section-1',
          name: 'Auto',
          code: 'auto',
          scoreElements: [{ id: 'element-1', code: 'auto_cones' }],
          bonusConditions: [],
          penaltyConditions: [],
        },
      ],
      scoreElements: [],
      bonusConditions: [],
      penaltyConditions: [],
    };

    const mockTournament = {
      id: 'tournament-1',
      name: 'Test Tournament',
    };

    it('should validate successfully when both config and tournament exist', async () => {
      prisma.scoreConfig.findUnique.mockResolvedValue(mockScoreConfig as any);
      prisma.tournament.findUnique.mockResolvedValue(mockTournament as any);

      const result = await service.validateScoreConfigForTournament('config-1', 'tournament-1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when score config is not found', async () => {
      prisma.scoreConfig.findUnique.mockResolvedValue(null);

      const result = await service.validateScoreConfigForTournament('non-existent-config', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Score config with ID non-existent-config not found');
    });

    it('should return error when tournament is not found', async () => {
      prisma.scoreConfig.findUnique.mockResolvedValue(mockScoreConfig as any);
      prisma.tournament.findUnique.mockResolvedValue(null);

      const result = await service.validateScoreConfigForTournament('config-1', 'non-existent-tournament');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tournament with ID non-existent-tournament not found');
    });

    it('should return warning when config is assigned to another tournament', async () => {
      const configAssignedToOtherTournament = {
        ...mockScoreConfig,
        tournamentId: 'other-tournament',
      };
      const otherTournament = {
        id: 'other-tournament',
        name: 'Other Tournament',
      };

      prisma.scoreConfig.findUnique.mockResolvedValue(configAssignedToOtherTournament as any);
      prisma.tournament.findUnique
        .mockResolvedValueOnce(mockTournament as any) // For target tournament
        .mockResolvedValueOnce(otherTournament as any); // For currently assigned tournament

      const result = await service.validateScoreConfigForTournament('config-1', 'tournament-1');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Score config is currently assigned to tournament "Other Tournament" and will be reassigned'
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      prisma.scoreConfig.findUnique.mockRejectedValue(dbError);

      const result = await service.validateScoreConfigForTournament('config-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation failed: Database error');
    });
  });

  describe('validation logic', () => {
    it('should detect duplicate section codes', async () => {
      const configWithDuplicateSections = {
        id: 'config-1',
        name: 'Test Config',
        tournamentId: 'tournament-1',
        scoreSections: [
          {
            id: 'section-1',
            name: 'Auto 1',
            code: 'auto',
            scoreElements: [{ id: 'element-1', code: 'cones' }],
            bonusConditions: [],
            penaltyConditions: [],
          },
          {
            id: 'section-2',
            name: 'Auto 2',
            code: 'auto', // Duplicate code
            scoreElements: [{ id: 'element-2', code: 'cubes' }],
            bonusConditions: [],
            penaltyConditions: [],
          },
        ],
        scoreElements: [],
        bonusConditions: [],
        penaltyConditions: [],
      };

      prisma.scoreConfig.findUnique.mockResolvedValue(configWithDuplicateSections as any);

      const result = await service.getScoreConfigWithPreview('config-1');

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toContain('Section codes must be unique within the configuration');
    });

    it('should detect duplicate element codes within sections', async () => {
      const configWithDuplicateElements = {
        id: 'config-1',
        name: 'Test Config',
        tournamentId: 'tournament-1',
        scoreSections: [
          {
            id: 'section-1',
            name: 'Auto',
            code: 'auto',
            scoreElements: [
              { id: 'element-1', code: 'cones' },
              { id: 'element-2', code: 'cones' }, // Duplicate code
            ],
            bonusConditions: [],
            penaltyConditions: [],
          },
        ],
        scoreElements: [],
        bonusConditions: [],
        penaltyConditions: [],
      };

      prisma.scoreConfig.findUnique.mockResolvedValue(configWithDuplicateElements as any);

      const result = await service.getScoreConfigWithPreview('config-1');

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toContain('Element codes must be unique within section "Auto"');
    });

    it('should detect formula referencing non-existent sections', async () => {
      const configWithInvalidFormula = {
        id: 'config-1',
        name: 'Test Config',
        tournamentId: 'tournament-1',
        totalScoreFormula: 'auto + teleop + endgame', // endgame section doesn't exist
        scoreSections: [
          {
            id: 'section-1',
            name: 'Auto',
            code: 'auto',
            scoreElements: [{ id: 'element-1', code: 'cones' }],
            bonusConditions: [],
            penaltyConditions: [],
          },
          {
            id: 'section-2',
            name: 'Teleop',
            code: 'teleop',
            scoreElements: [{ id: 'element-2', code: 'cubes' }],
            bonusConditions: [],
            penaltyConditions: [],
          },
        ],
        scoreElements: [],
        bonusConditions: [],
        penaltyConditions: [],
      };

      prisma.scoreConfig.findUnique.mockResolvedValue(configWithInvalidFormula as any);

      const result = await service.getScoreConfigWithPreview('config-1');

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toContain('Formula references non-existent sections: endgame');
    });

    it('should warn about invalid bonus/penalty conditions', async () => {
      const configWithInvalidConditions = {
        id: 'config-1',
        name: 'Test Config',
        tournamentId: 'tournament-1',
        scoreSections: [
          {
            id: 'section-1',
            name: 'Auto',
            code: 'auto',
            scoreElements: [{ id: 'element-1', code: 'cones' }],
            bonusConditions: [
              {
                id: 'bonus-1',
                name: 'Test Bonus',
                condition: null, // Invalid condition
              },
            ],
            penaltyConditions: [
              {
                id: 'penalty-1',
                name: 'Test Penalty',
                condition: 'invalid', // Invalid condition (should be object)
              },
            ],
          },
        ],
        scoreElements: [],
        bonusConditions: [
          {
            id: 'legacy-bonus-1',
            name: 'Legacy Bonus',
            condition: undefined, // Invalid condition
          },
        ],
        penaltyConditions: [],
      };

      prisma.scoreConfig.findUnique.mockResolvedValue(configWithInvalidConditions as any);

      const result = await service.getScoreConfigWithPreview('config-1');

      expect(result.validation.warnings).toContain(
        'Bonus condition "Test Bonus" in section "Auto" has invalid condition structure'
      );
      expect(result.validation.warnings).toContain(
        'Penalty condition "Test Penalty" in section "Auto" has invalid condition structure'
      );
      expect(result.validation.warnings).toContain(
        'Legacy bonus condition "Legacy Bonus" has invalid condition structure'
      );
    });
  });

  describe('cache management', () => {
    it('should clear specific tournament cache', () => {
      service.clearCache('tournament-1');
      // No direct way to test cache clearing, but method should not throw
    });

    it('should clear all cache', () => {
      service.clearCache();
      // No direct way to test cache clearing, but method should not throw
    });

    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });
  });

  describe('getFallbackScoreConfig', () => {
    it('should return null for fallback config', async () => {
      const result = await service.getFallbackScoreConfig();
      expect(result).toBeNull();
    });
  });
});
