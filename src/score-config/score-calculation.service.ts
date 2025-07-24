import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConditionEvaluatorFactory } from './strategies/condition-evaluator.factory';
import { Condition } from './interfaces/condition.interface';
import { FormulaEvaluatorService } from './formula-evaluator.service';
import { ScoreConfigResolutionService, ScoreConfigWithDetails } from './score-config-resolution.service';

@Injectable()
export class ScoreCalculationService {
  private readonly logger = new Logger(ScoreCalculationService.name);
  
  constructor(
    private prisma: PrismaService,
    private conditionEvaluatorFactory: ConditionEvaluatorFactory,
    private formulaEvaluator: FormulaEvaluatorService,
    private scoreConfigResolutionService: ScoreConfigResolutionService,
  ) {}

  private isValidCondition(condition: any): condition is Condition {
    return condition && typeof condition === 'object' && condition.type;
  }

  async calculateMatchScore(
    matchId: string, 
    allianceId: string, 
    elementScores: Record<string, number>,
    scoreConfigId?: string
  ) {
    // 1. Get the match and alliance to verify they exist
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { 
        stage: { 
          include: { tournament: true } 
        } 
      },
    });
    
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }
    
    const alliance = await this.prisma.alliance.findUnique({
      where: { id: allianceId },
    });
    
    if (!alliance) {
      throw new NotFoundException(`Alliance with ID ${allianceId} not found`);
    }
    
    // 2. Get the score config (either provided or from tournament)
    const configId = scoreConfigId || 
      (await this.prisma.scoreConfig.findFirst({
        where: { tournamentId: match.stage.tournament.id },
        orderBy: { createdAt: 'desc' },
      }))?.id;
    
    if (!configId) {
      throw new NotFoundException(`No score configuration found for this match`);
    }
    
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id: configId },
      include: {
        scoreElements: true,
        bonusConditions: true,
        penaltyConditions: true,
        scoreSections: {
          include: {
            scoreElements: true,
            bonusConditions: true,
            penaltyConditions: true,
          },
        },
      },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${configId} not found`);
    }
    
    // 3. Calculate base scores from elementScores
    let totalScore = 0;
    const calculationLog: any = { elements: [], bonuses: [], penalties: [] };
    
    // Process each score element
    for (const element of scoreConfig.scoreElements) {
      const value = elementScores[element.code] || 0;
      const elementScore = value * element.pointsPerUnit;
      totalScore += elementScore;
      
      calculationLog.elements.push({
        elementCode: element.code,
        elementName: element.name,
        value,
        pointsPerUnit: element.pointsPerUnit,
        totalPoints: elementScore,
      });
    }    // 4. Evaluate bonus conditions
    const bonusesEarned: string[] = [];
    
    for (const bonus of scoreConfig.bonusConditions) {
      if (!this.isValidCondition(bonus.condition)) continue; // Skip if condition is null or invalid
      
      const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(bonus.condition);
      const conditionMet = conditionEvaluator.evaluate(elementScores);
      
      if (conditionMet) {
        totalScore += bonus.bonusPoints;
        bonusesEarned.push(bonus.id);
        
        calculationLog.bonuses.push({
          bonusCode: bonus.code,
          bonusName: bonus.name,
          bonusPoints: bonus.bonusPoints,
        });
      }
    }
    
    // 5. Evaluate penalty conditions
    const penaltiesIncurred: string[] = [];
    
    for (const penalty of scoreConfig.penaltyConditions) {
      if (!this.isValidCondition(penalty.condition)) continue; // Skip if condition is null or invalid
      
      const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(penalty.condition);
      const conditionMet = conditionEvaluator.evaluate(elementScores);
      
      if (conditionMet) {
        totalScore += penalty.penaltyPoints; // Note: penalty points are already negative
        penaltiesIncurred.push(penalty.id);
        
        calculationLog.penalties.push({
          penaltyCode: penalty.code,
          penaltyName: penalty.name,
          penaltyPoints: penalty.penaltyPoints,
        });
      }
    }
    
    calculationLog.totalScore = totalScore;
      // 6. Save and return simple result
    // Note: This service needs to be redesigned to work with the current MatchScore schema
    // which stores individual score elements, not aggregate scores
    return {
      matchId,
      allianceId,
      elementScores,
      bonusesEarned,
      penaltiesIncurred,
      totalScore,
      calculationLog, // Include the detailed log in the final result
    };
  }

  // New method to bridge element-based scoring with alliance-based persistence
  async calculateAndPersistMatchScore(
    matchId: string,
    allianceId: string,
    elementScores: Record<string, number>,
    scoreConfigId?: string
  ) {
    // 1. Calculate score using the existing method
    const calculationResult = await this.calculateMatchScore(
      matchId,
      allianceId,
      elementScores,
      scoreConfigId
    );

    // 2. Extract auto and drive scores from the calculation log based on categories
    const autoScore = this.extractCategoryScore(calculationResult.calculationLog, 'auto');
    const driveScore = this.extractCategoryScore(calculationResult.calculationLog, 'teleop');

    // 3. Update alliance scores in the database
    await this.prisma.alliance.update({
      where: { id: allianceId },
      data: {
        autoScore,
        driveScore,
        score: calculationResult.totalScore,
      },
    });

    // 4. Return the full calculation result
    return calculationResult;
  }

  // Helper to extract scores based on element categories
  private extractCategoryScore(calculationLog: any, category: 'auto' | 'teleop'): number {
    let categoryScore = 0;

    if (calculationLog && calculationLog.elements) {
      for (const element of calculationLog.elements) {
        // This assumes element names or codes can identify their category
        // e.g., 'auto_cone', 'teleop_cube'
        if (element.elementCode.startsWith(category)) {
          categoryScore += element.totalPoints;
        }
      }
    }

    return categoryScore;
  }

  /**
   * New section-based score calculation that supports custom formulas
   */
  async calculateMatchScoreWithSections(
    matchId: string,
    allianceId: string,
    elementScores: Record<string, number>,
    scoreConfigId?: string
  ) {
    // 1. Get the match and alliance to verify they exist
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { 
        stage: { 
          include: { tournament: true } 
        } 
      },
    });
    
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }
    
    const alliance = await this.prisma.alliance.findUnique({
      where: { id: allianceId },
    });
    
    if (!alliance) {
      throw new NotFoundException(`Alliance with ID ${allianceId} not found`);
    }
    
    // 2. Get the score config with sections
    const configId = scoreConfigId || 
      (await this.prisma.scoreConfig.findFirst({
        where: { tournamentId: match.stage.tournament.id },
        orderBy: { createdAt: 'desc' },
      }))?.id;
    
    if (!configId) {
      throw new NotFoundException(`No score configuration found for this match`);
    }
    
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id: configId },
      include: {
        scoreElements: true,
        bonusConditions: true,
        penaltyConditions: true,
        scoreSections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            scoreElements: { orderBy: { displayOrder: 'asc' } },
            bonusConditions: { orderBy: { displayOrder: 'asc' } },
            penaltyConditions: { orderBy: { displayOrder: 'asc' } },
          },
        },
      },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${configId} not found`);
    }

    const calculationLog: any = {
      sections: [],
      legacyElements: [],
      legacyBonuses: [],
      legacyPenalties: [],
      sectionScores: {},
      totalScore: 0,
    };

    // 3. Calculate section scores if sections exist
    if (scoreConfig.scoreSections && scoreConfig.scoreSections.length > 0) {
      for (const section of scoreConfig.scoreSections) {
        const sectionResult = this.calculateSectionScore(section, elementScores);
        calculationLog.sections.push(sectionResult);
        calculationLog.sectionScores[section.code] = sectionResult.totalScore;
      }

      // 4. Apply formula to calculate total score
      if (scoreConfig.totalScoreFormula) {
        calculationLog.totalScore = this.formulaEvaluator.evaluateFormula(
          scoreConfig.totalScoreFormula,
          calculationLog.sectionScores
        );
      } else {
        // If no formula, sum all section scores
        calculationLog.totalScore = Object.values(calculationLog.sectionScores)
          .reduce((sum: number, score: number) => sum + score, 0);
      }
    }

    // 5. Handle legacy elements, bonuses, and penalties (for backward compatibility)
    let legacyScore = 0;

    // Process legacy elements
    for (const element of scoreConfig.scoreElements || []) {
      const value = elementScores[element.code] || 0;
      const elementScore = value * element.pointsPerUnit;
      legacyScore += elementScore;
      
      calculationLog.legacyElements.push({
        elementCode: element.code,
        elementName: element.name,
        value,
        pointsPerUnit: element.pointsPerUnit,
        totalPoints: elementScore,
      });
    }

    // Process legacy bonuses
    const bonusesEarned: string[] = [];
    for (const bonus of scoreConfig.bonusConditions || []) {
      if (!this.isValidCondition(bonus.condition)) continue;
      
      const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(bonus.condition);
      const conditionMet = conditionEvaluator.evaluate(elementScores);
      
      if (conditionMet) {
        legacyScore += bonus.bonusPoints;
        bonusesEarned.push(bonus.id);
        
        calculationLog.legacyBonuses.push({
          bonusCode: bonus.code,
          bonusName: bonus.name,
          bonusPoints: bonus.bonusPoints,
        });
      }
    }

    // Process legacy penalties
    const penaltiesIncurred: string[] = [];
    for (const penalty of scoreConfig.penaltyConditions || []) {
      if (!this.isValidCondition(penalty.condition)) continue;
      
      const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(penalty.condition);
      const conditionMet = conditionEvaluator.evaluate(elementScores);
      
      if (conditionMet) {
        legacyScore += penalty.penaltyPoints;
        penaltiesIncurred.push(penalty.id);
        
        calculationLog.legacyPenalties.push({
          penaltyCode: penalty.code,
          penaltyName: penalty.name,
          penaltyPoints: penalty.penaltyPoints,
        });
      }
    }

    // Add legacy score to total if no sections exist
    if (!scoreConfig.scoreSections || scoreConfig.scoreSections.length === 0) {
      calculationLog.totalScore = legacyScore;
    }

    return {
      matchId,
      allianceId,
      elementScores,
      bonusesEarned,
      penaltiesIncurred,
      totalScore: calculationLog.totalScore,
      calculationLog,
      usingSections: scoreConfig.scoreSections && scoreConfig.scoreSections.length > 0,
      formula: scoreConfig.totalScoreFormula,
    };
  }

  /**
   * Calculate score for a single section
   * Now handles bonus and penalty sections separately
   */
  private calculateSectionScore(section: any, elementScores: Record<string, number>) {
    const sectionLog: any = {
      sectionCode: section.code,
      sectionName: section.name,
      elements: [],
      bonuses: [],
      penalties: [],
      totalScore: 0,
    };

    let sectionScore = 0;

    // Process section elements (for regular sections)
    for (const element of section.scoreElements || []) {
      const value = elementScores[element.code] || 0;
      const elementScore = value * element.pointsPerUnit;
      sectionScore += elementScore;
      
      sectionLog.elements.push({
        elementCode: element.code,
        elementName: element.name,
        value,
        pointsPerUnit: element.pointsPerUnit,
        totalPoints: elementScore,
      });
    }

    // For bonus sections (code === 'bonus'), only calculate bonuses
    if (section.code === 'bonus') {
      for (const bonus of section.bonusConditions || []) {
        if (!this.isValidCondition(bonus.condition)) continue;
        
        const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(bonus.condition);
        const conditionMet = conditionEvaluator.evaluate(elementScores);
        
        if (conditionMet) {
          sectionScore += bonus.bonusPoints;
          
          sectionLog.bonuses.push({
            bonusCode: bonus.code,
            bonusName: bonus.name,
            bonusPoints: bonus.bonusPoints,
          });
        }
      }
    }
    // For penalty sections (code === 'penalty'), only calculate penalties  
    else if (section.code === 'penalty') {
      for (const penalty of section.penaltyConditions || []) {
        if (!this.isValidCondition(penalty.condition)) continue;
        
        const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(penalty.condition);
        const conditionMet = conditionEvaluator.evaluate(elementScores);
        
        if (conditionMet) {
          sectionScore += penalty.penaltyPoints;
          
          sectionLog.penalties.push({
            penaltyCode: penalty.code,
            penaltyName: penalty.name,
            penaltyPoints: penalty.penaltyPoints,
          });
        }
      }
    }
    // For regular sections, still process bonuses and penalties if they exist
    else {
      // Process section bonuses
      for (const bonus of section.bonusConditions || []) {
        if (!this.isValidCondition(bonus.condition)) continue;
        
        const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(bonus.condition);
        const conditionMet = conditionEvaluator.evaluate(elementScores);
        
        if (conditionMet) {
          sectionScore += bonus.bonusPoints;
          
          sectionLog.bonuses.push({
            bonusCode: bonus.code,
            bonusName: bonus.name,
            bonusPoints: bonus.bonusPoints,
          });
        }
      }

      // Process section penalties
      for (const penalty of section.penaltyConditions || []) {
        if (!this.isValidCondition(penalty.condition)) continue;
        
        const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(penalty.condition);
        const conditionMet = conditionEvaluator.evaluate(elementScores);
        
        if (conditionMet) {
          sectionScore += penalty.penaltyPoints;
          
          sectionLog.penalties.push({
            penaltyCode: penalty.code,
            penaltyName: penalty.name,
            penaltyPoints: penalty.penaltyPoints,
          });
        }
      }
    }

    sectionLog.totalScore = sectionScore;
    return sectionLog;
  }

  /**
   * Enhanced method that uses ScoreConfigResolutionService for automatic tournament config resolution
   */
  async calculateMatchScoreWithTournamentConfig(
    matchId: string,
    allianceId: string,
    elementScores: Record<string, number>
  ) {
    this.logger.log(`Calculating match score for match: ${matchId}, alliance: ${allianceId}`);

    try {
      // 1. Resolve score configuration using the resolution service
      const scoreConfig = await this.scoreConfigResolutionService.resolveScoreConfigForMatch(matchId);
      
      if (!scoreConfig) {
        this.logger.warn(`No score configuration found for match ${matchId}, using fallback`);
        return this.calculateFallbackScore(matchId, allianceId, elementScores);
      }

      // 2. Verify alliance exists
      const alliance = await this.prisma.alliance.findUnique({
        where: { id: allianceId },
      });
      
      if (!alliance) {
        throw new NotFoundException(`Alliance with ID ${allianceId} not found`);
      }

      // 3. Use the enhanced calculation method with the resolved config
      return this.calculateScoreWithConfig(matchId, allianceId, elementScores, scoreConfig);
      
    } catch (error) {
      this.logger.error(`Error calculating score for match ${matchId}:`, error);
      
      // If there's an error with the tournament config, fall back to basic calculation
      if (error instanceof NotFoundException && error.message.includes('score configuration')) {
        this.logger.warn(`Score configuration error for match ${matchId}, using fallback calculation`);
        return this.calculateFallbackScore(matchId, allianceId, elementScores);
      }
      
      throw error;
    }
  }

  /**
   * Enhanced method that persists scores with tournament configuration
   */
  async calculateAndPersistWithTournamentConfig(
    matchId: string,
    allianceId: string,
    elementScores: Record<string, number>
  ) {
    this.logger.log(`Calculating and persisting score for match: ${matchId}, alliance: ${allianceId}`);

    // 1. Calculate the score using tournament configuration
    const calculationResult = await this.calculateMatchScoreWithTournamentConfig(
      matchId,
      allianceId,
      elementScores
    );

    // 2. Extract category scores for persistence
    const { autoScore, driveScore } = this.extractCategoryScores(calculationResult.calculationLog);

    try {
      // 3. Persist scores to database
      await this.prisma.alliance.update({
        where: { id: allianceId },
        data: {
          autoScore,
          driveScore,
          score: calculationResult.totalScore,
        },
      });

      this.logger.log(`Successfully persisted scores for alliance ${allianceId}: total=${calculationResult.totalScore}, auto=${autoScore}, drive=${driveScore}`);
      
      return {
        ...calculationResult,
        persistedScores: {
          autoScore,
          driveScore,
          totalScore: calculationResult.totalScore,
        },
      };
      
    } catch (error) {
      this.logger.error(`Failed to persist scores for alliance ${allianceId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate score using a specific score configuration
   */
  private async calculateScoreWithConfig(
    matchId: string,
    allianceId: string,
    elementScores: Record<string, number>,
    scoreConfig: ScoreConfigWithDetails
  ) {
    const calculationLog: any = {
      configId: scoreConfig.id,
      configName: scoreConfig.name,
      sections: [],
      legacyElements: [],
      legacyBonuses: [],
      legacyPenalties: [],
      sectionScores: {},
      totalScore: 0,
      usingSections: false,
      usingFallback: false,
    };

    // Calculate section scores if sections exist
    if (scoreConfig.scoreSections?.length > 0) {
      calculationLog.usingSections = true;
      
      for (const section of scoreConfig.scoreSections) {
        const sectionResult = this.calculateSectionScore(section, elementScores);
        calculationLog.sections.push(sectionResult);
        calculationLog.sectionScores[section.code] = sectionResult.totalScore;
      }

      // Apply formula to calculate total score
      if (scoreConfig.totalScoreFormula) {
        try {
          calculationLog.totalScore = this.formulaEvaluator.evaluateFormula(
            scoreConfig.totalScoreFormula,
            calculationLog.sectionScores
          );
        } catch (error) {
          this.logger.warn(`Formula evaluation failed for config ${scoreConfig.id}, using sum instead:`, error);
          calculationLog.totalScore = Object.values(calculationLog.sectionScores)
            .reduce((sum: number, score: number) => sum + score, 0);
        }
      } else {
        // If no formula, sum all section scores
        calculationLog.totalScore = Object.values(calculationLog.sectionScores)
          .reduce((sum: number, score: number) => sum + score, 0);
      }
    } else {
      // Handle legacy elements for backward compatibility
      let legacyScore = 0;

      // Process legacy elements
      for (const element of scoreConfig.scoreElements || []) {
        const value = elementScores[element.code] || 0;
        const elementScore = value * element.pointsPerUnit;
        legacyScore += elementScore;
        
        calculationLog.legacyElements.push({
          elementCode: element.code,
          elementName: element.name,
          value,
          pointsPerUnit: element.pointsPerUnit,
          totalPoints: elementScore,
        });
      }

      // Process legacy bonuses
      const bonusesEarned: string[] = [];
      for (const bonus of scoreConfig.bonusConditions || []) {
        if (!this.isValidCondition(bonus.condition)) continue;
        
        try {
          const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(bonus.condition);
          const conditionMet = conditionEvaluator.evaluate(elementScores);
          
          if (conditionMet) {
            legacyScore += bonus.bonusPoints;
            bonusesEarned.push(bonus.id);
            
            calculationLog.legacyBonuses.push({
              bonusCode: bonus.code,
              bonusName: bonus.name,
              bonusPoints: bonus.bonusPoints,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to evaluate bonus condition for ${bonus.name}:`, error);
        }
      }

      // Process legacy penalties
      const penaltiesIncurred: string[] = [];
      for (const penalty of scoreConfig.penaltyConditions || []) {
        if (!this.isValidCondition(penalty.condition)) continue;
        
        try {
          const conditionEvaluator = this.conditionEvaluatorFactory.createEvaluator(penalty.condition);
          const conditionMet = conditionEvaluator.evaluate(elementScores);
          
          if (conditionMet) {
            legacyScore += penalty.penaltyPoints;
            penaltiesIncurred.push(penalty.id);
            
            calculationLog.legacyPenalties.push({
              penaltyCode: penalty.code,
              penaltyName: penalty.name, 
              penaltyPoints: penalty.penaltyPoints,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to evaluate penalty condition for ${penalty.name}:`, error);
        }
      }

      calculationLog.totalScore = legacyScore;
    }

    return {
      matchId,
      allianceId,
      elementScores,
      bonusesEarned: [],
      penaltiesIncurred: [],
      totalScore: calculationLog.totalScore,
      calculationLog,
      usingSections: calculationLog.usingSections,
      formula: scoreConfig.totalScoreFormula,
    };
  }

  /**
   * Fallback score calculation for tournaments without assigned score configurations
   */
  private async calculateFallbackScore(
    matchId: string,
    allianceId: string,
    elementScores: Record<string, number>
  ) {
    this.logger.log(`Using fallback score calculation for match: ${matchId}`);
    
    // Simple fallback: sum all element scores with basic point values
    let totalScore = 0;
    const calculationLog: any = {
      elements: [],
      totalScore: 0,
      usingFallback: true,
      fallbackReason: 'No score configuration found for tournament',
    };

    // Apply basic scoring rules
    Object.entries(elementScores).forEach(([elementCode, value]) => {
      const pointsPerUnit = this.getFallbackPointValue(elementCode);
      const elementScore = value * pointsPerUnit;
      totalScore += elementScore;
      
      calculationLog.elements.push({
        elementCode,
        elementName: elementCode.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
        pointsPerUnit,
        totalPoints: elementScore,
      });
    });

    calculationLog.totalScore = totalScore;

    return {
      matchId,
      allianceId,
      elementScores,
      bonusesEarned: [],
      penaltiesIncurred: [],
      totalScore,
      calculationLog,
      usingSections: false,
      usingFallback: true,
    };
  }

  /**
   * Get fallback point values for elements when no score config is available
   */
  private getFallbackPointValue(elementCode: string): number {
    const code = elementCode.toLowerCase();
    
    // Basic scoring rules based on element naming conventions
    if (code.includes('auto')) {
      return 10; // Autonomous actions worth more
    } else if (code.includes('teleop') || code.includes('driver')) {
      return 5; // Teleop actions worth medium
    } else if (code.includes('endgame') || code.includes('park') || code.includes('climb')) {
      return 15; // Endgame actions worth more
    } else if (code.includes('penalty') || code.includes('foul')) {
      return -10; // Penalties are negative
    } else {
      return 3; // Default low value
    }
  }

  /**
   * Enhanced method to extract category scores with better categorization
   */
  private extractCategoryScores(calculationLog: any): { autoScore: number; driveScore: number } {
    let autoScore = 0;
    let driveScore = 0;

    // Extract from sections if available
    if (calculationLog.sections?.length > 0) {
      for (const section of calculationLog.sections) {
        const sectionCode = section.sectionCode.toLowerCase();
        if (sectionCode.includes('auto') || sectionCode.includes('autonomous')) {
          autoScore += section.totalScore;
        } else if (sectionCode.includes('teleop') || sectionCode.includes('driver')) {
          driveScore += section.totalScore;
        } else {
          // Default unknown sections to drive score
          driveScore += section.totalScore;
        }
      }
    }
    
    // Extract from legacy elements if no sections
    if (calculationLog.legacyElements?.length > 0) {
      for (const element of calculationLog.legacyElements) {
        const elementCode = element.elementCode.toLowerCase();
        if (elementCode.includes('auto')) {
          autoScore += element.totalPoints;
        } else {
          driveScore += element.totalPoints;
        }
      }
    }
    
    // Extract from fallback elements
    if (calculationLog.elements?.length > 0) {
      for (const element of calculationLog.elements) {
        const elementCode = element.elementCode.toLowerCase();
        if (elementCode.includes('auto')) {
          autoScore += element.totalPoints;
        } else {
          driveScore += element.totalPoints;
        }
      }
    }

    return { autoScore, driveScore };
  }

  /**
   * Validate score configuration before calculation
   */
  private validateScoreConfig(scoreConfig: ScoreConfigWithDetails): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if config has any scoring mechanism
    const hasElements = (scoreConfig.scoreElements?.length || 0) > 0;
    const hasSections = (scoreConfig.scoreSections?.length || 0) > 0;
    const hasSectionElements = scoreConfig.scoreSections?.some(section => (section.scoreElements?.length || 0) > 0);
    
    if (!hasElements && !hasSections) {
      errors.push('Score configuration has no scoring elements or sections');
    }
    
    if (hasSections && !hasSectionElements) {
      errors.push('Score sections exist but contain no elements');
    }
    
    // Validate formula if present
    if (scoreConfig.totalScoreFormula) {
      try {
        // Basic formula validation - check for obvious syntax errors
        if (scoreConfig.totalScoreFormula.includes('undefined') || 
            scoreConfig.totalScoreFormula.includes('null')) {
          errors.push('Score formula contains invalid references');
        }
      } catch (error) {
        errors.push(`Score formula validation failed: ${error.message}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
