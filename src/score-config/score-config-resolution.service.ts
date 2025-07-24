import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ScoreConfig, ScoreSection, ScoreElement, BonusCondition, PenaltyCondition } from '../utils/prisma-types';

export interface ScoreConfigWithDetails extends ScoreConfig {
  scoreSections: (ScoreSection & {
    scoreElements: ScoreElement[];
    bonusConditions: BonusCondition[];
    penaltyConditions: PenaltyCondition[];
  })[];
  scoreElements: ScoreElement[];
  bonusConditions: BonusCondition[];
  penaltyConditions: PenaltyCondition[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Service responsible for resolving score configurations for matches
 * via the tournament relationship and providing caching for performance
 */
@Injectable()
export class ScoreConfigResolutionService {
  private readonly logger = new Logger(ScoreConfigResolutionService.name);
  private readonly configCache = new Map<string, { config: ScoreConfigWithDetails | null; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the appropriate score-config for a given match via tournament relationship
   * @param matchId - ID of the match to resolve score config for
   * @returns Score config with all related data or null if none found
   */
  async resolveScoreConfigForMatch(matchId: string): Promise<ScoreConfigWithDetails | null> {
    this.logger.log(`Resolving score config for match: ${matchId}`);

    try {
      // First, get the match with its tournament relationship
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
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

      if (!match) {
        throw new NotFoundException(`Match with ID ${matchId} not found`);
      }

      if (!match.stage?.tournament) {
        this.logger.warn(`Match ${matchId} has no associated tournament`);
        return null;
      }

      const tournamentId = match.stage.tournament.id;
      this.logger.log(`Match ${matchId} belongs to tournament: ${tournamentId} (${match.stage.tournament.name})`);

      // Check cache first
      const cacheKey = tournamentId;
      const cachedResult = this.configCache.get(cacheKey);
      if (cachedResult && Date.now() - cachedResult.timestamp < this.CACHE_TTL) {
        this.logger.log(`Using cached score config for tournament: ${tournamentId}`);
        return cachedResult.config;
      }

      // Get score config for tournament
      const scoreConfig = await this.getScoreConfigForTournament(tournamentId);

      // Cache the result
      this.configCache.set(cacheKey, {
        config: scoreConfig,
        timestamp: Date.now(),
      });

      if (scoreConfig) {
        this.logger.log(`Found score config: ${scoreConfig.name} (${scoreConfig.id}) for tournament: ${tournamentId}`);
      } else {
        this.logger.warn(`No score config found for tournament: ${tournamentId}`);
      }

      return scoreConfig;
    } catch (error) {
      this.logger.error(`Failed to resolve score config for match ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Gets score configuration for a specific tournament
   * @param tournamentId - ID of the tournament
   * @returns Score config with all related data or null if none found
   */
  private async getScoreConfigForTournament(tournamentId: string): Promise<ScoreConfigWithDetails | null> {
    this.logger.log(`Getting score config for tournament: ${tournamentId}`);

    const scoreConfig = await this.prisma.scoreConfig.findFirst({
      where: { tournamentId },
      include: {
        scoreSections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            scoreElements: { orderBy: { displayOrder: 'asc' } },
            bonusConditions: { orderBy: { displayOrder: 'asc' } },
            penaltyConditions: { orderBy: { displayOrder: 'asc' } },
          },
        },
        scoreElements: { orderBy: { displayOrder: 'asc' } },
        bonusConditions: { orderBy: { displayOrder: 'asc' } },
        penaltyConditions: { orderBy: { displayOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' }, // Get the most recent if multiple exist
    });

    return scoreConfig as ScoreConfigWithDetails | null;
  }

  /**
   * Gets score configuration with preview data for UI rendering
   * @param scoreConfigId - ID of the score configuration
   * @returns Score config with validation information
   */
  async getScoreConfigWithPreview(scoreConfigId: string): Promise<{
    config: ScoreConfigWithDetails;
    validation: ValidationResult;
  }> {
    this.logger.log(`Getting score config with preview: ${scoreConfigId}`);

    const config = await this.prisma.scoreConfig.findUnique({
      where: { id: scoreConfigId },
      include: {
        scoreSections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            scoreElements: { orderBy: { displayOrder: 'asc' } },
            bonusConditions: { orderBy: { displayOrder: 'asc' } },
            penaltyConditions: { orderBy: { displayOrder: 'asc' } },
          },
        },
        scoreElements: { orderBy: { displayOrder: 'asc' } },
        bonusConditions: { orderBy: { displayOrder: 'asc' } },
        penaltyConditions: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!config) {
      throw new NotFoundException(`Score config with ID ${scoreConfigId} not found`);
    }

    const validation = this.validateScoreConfig(config as ScoreConfigWithDetails);

    return {
      config: config as ScoreConfigWithDetails,
      validation,
    };
  }

  /**
   * Validates a score configuration for completeness and correctness
   * @param config - Score configuration to validate
   * @returns Validation result with errors and warnings
   */
  private validateScoreConfig(config: ScoreConfigWithDetails): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if config has any scoring elements or sections
    const hasElements = config.scoreElements?.length > 0;
    const hasSections = config.scoreSections?.length > 0;
    const hasSectionElements = config.scoreSections?.some(section => section.scoreElements?.length > 0);

    if (!hasElements && !hasSections) {
      errors.push('Score configuration must have either score elements or score sections with elements');
    }

    if (hasSections && !hasSectionElements) {
      warnings.push('Score sections exist but contain no score elements');
    }

    // Validate section codes are unique
    if (config.scoreSections?.length > 0) {
      const sectionCodes = config.scoreSections.map(section => section.code);
      const uniqueSectionCodes = new Set(sectionCodes);
      if (sectionCodes.length !== uniqueSectionCodes.size) {
        errors.push('Section codes must be unique within the configuration');
      }
    }

    // Validate element codes are unique within sections
    config.scoreSections?.forEach(section => {
      if (section.scoreElements?.length > 0) {
        const elementCodes = section.scoreElements.map(element => element.code);
        const uniqueElementCodes = new Set(elementCodes);
        if (elementCodes.length !== uniqueElementCodes.size) {
          errors.push(`Element codes must be unique within section "${section.name}"`);
        }
      }
    });

    // Validate legacy element codes are unique
    if (config.scoreElements?.length > 0) {
      const elementCodes = config.scoreElements.map(element => element.code);
      const uniqueElementCodes = new Set(elementCodes);
      if (elementCodes.length !== uniqueElementCodes.size) {
        errors.push('Legacy element codes must be unique within the configuration');
      }
    }

    // Validate formula if it exists
    if (config.totalScoreFormula && config.scoreSections?.length > 0) {
      const sectionCodes = config.scoreSections.map(section => section.code);
      const formula = config.totalScoreFormula;

      // Basic formula validation - check if referenced sections exist
      const referencedSections = this.extractSectionReferencesFromFormula(formula);
      const missingSections = referencedSections.filter(ref => !sectionCodes.includes(ref));
      
      if (missingSections.length > 0) {
        errors.push(`Formula references non-existent sections: ${missingSections.join(', ')}`);
      }
    }

    // Validate bonus/penalty conditions exist and are properly structured
    config.scoreSections?.forEach(section => {
      section.bonusConditions?.forEach(bonus => {
        if (!bonus.condition || typeof bonus.condition !== 'object') {
          warnings.push(`Bonus condition "${bonus.name}" in section "${section.name}" has invalid condition structure`);
        }
      });

      section.penaltyConditions?.forEach(penalty => {
        if (!penalty.condition || typeof penalty.condition !== 'object') {
          warnings.push(`Penalty condition "${penalty.name}" in section "${section.name}" has invalid condition structure`);
        }
      });
    });

    // Legacy bonus/penalty validation
    config.bonusConditions?.forEach(bonus => {
      if (!bonus.condition || typeof bonus.condition !== 'object') {
        warnings.push(`Legacy bonus condition "${bonus.name}" has invalid condition structure`);
      }
    });

    config.penaltyConditions?.forEach(penalty => {
      if (!penalty.condition || typeof penalty.condition !== 'object') {
        warnings.push(`Legacy penalty condition "${penalty.name}" has invalid condition structure`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates that a score config is compatible with a tournament
   * @param scoreConfigId - ID of the score configuration
   * @param tournamentId - ID of the tournament
   * @returns Validation result
   */
  async validateScoreConfigForTournament(scoreConfigId: string, tournamentId: string): Promise<ValidationResult> {
    this.logger.log(`Validating score config ${scoreConfigId} for tournament ${tournamentId}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if score config exists
      const scoreConfig = await this.prisma.scoreConfig.findUnique({
        where: { id: scoreConfigId },
        include: {
          scoreSections: {
            include: {
              scoreElements: true,
              bonusConditions: true,
              penaltyConditions: true,
            },
          },
          scoreElements: true,
          bonusConditions: true,
          penaltyConditions: true,
        },
      });

      if (!scoreConfig) {
        errors.push(`Score config with ID ${scoreConfigId} not found`);
        return { isValid: false, errors, warnings };
      }

      // Check if tournament exists
      const tournament = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
      });

      if (!tournament) {
        errors.push(`Tournament with ID ${tournamentId} not found`);
        return { isValid: false, errors, warnings };
      }

      // Validate the score config itself
      const configValidation = this.validateScoreConfig(scoreConfig as ScoreConfigWithDetails);
      errors.push(...configValidation.errors);
      warnings.push(...configValidation.warnings);

      // Check if score config is already assigned to another tournament
      if (scoreConfig.tournamentId && scoreConfig.tournamentId !== tournamentId) {
        const assignedTournament = await this.prisma.tournament.findUnique({
          where: { id: scoreConfig.tournamentId },
          select: { name: true },
        });
        
        warnings.push(
          `Score config is currently assigned to tournament "${assignedTournament?.name || 'Unknown'}" and will be reassigned`
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Error validating score config for tournament:`, error);
      errors.push(`Validation failed: ${error.message}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Gets a fallback score configuration for matches without assigned configs
   * This creates a basic auto/teleop scoring configuration
   * @returns Basic score configuration or null if none can be created
   */
  async getFallbackScoreConfig(): Promise<ScoreConfigWithDetails | null> {
    this.logger.log('Getting fallback score configuration');

    // For now, return null to indicate fallback to legacy scoring
    // In the future, this could create a basic default configuration
    return null;
  }

  /**
   * Clears the cache for a specific tournament or all cache entries
   * @param tournamentId - Optional tournament ID to clear specific cache entry
   */
  clearCache(tournamentId?: string): void {
    if (tournamentId) {
      this.configCache.delete(tournamentId);
      this.logger.log(`Cleared cache for tournament: ${tournamentId}`);
    } else {
      this.configCache.clear();
      this.logger.log('Cleared all score config cache');
    }
  }

  /**
   * Gets cache statistics for monitoring
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; entries: { tournamentId: string; timestamp: number; hasConfig: boolean }[] } {
    const entries = Array.from(this.configCache.entries()).map(([tournamentId, cached]) => ({
      tournamentId,
      timestamp: cached.timestamp,
      hasConfig: cached.config !== null,
    }));

    return {
      size: this.configCache.size,
      entries,
    };
  }

  /**
   * Extracts section references from a formula string
   * @param formula - Formula string to analyze
   * @returns Array of section codes referenced in the formula
   */
  private extractSectionReferencesFromFormula(formula: string): string[] {
    // Simple regex to find variable names (section codes) in formula
    // This assumes section codes are valid JavaScript identifiers
    const variableRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    const matches = formula.match(variableRegex) || [];
    
    // Filter out common mathematical functions and operators
    const excludedTerms = new Set(['Math', 'max', 'min', 'abs', 'floor', 'ceil', 'round', 'sqrt', 'pow']);
    
    return matches.filter(match => !excludedTerms.has(match));
  }
}
