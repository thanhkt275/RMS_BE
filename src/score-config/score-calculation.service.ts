import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConditionEvaluatorFactory } from './strategies/condition-evaluator.factory';
import { Condition } from './interfaces/condition.interface';

@Injectable()
export class ScoreCalculationService {
  constructor(
    private prisma: PrismaService,
    private conditionEvaluatorFactory: ConditionEvaluatorFactory,
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
}
