import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ScoreConfigWithDetails } from './score-config-resolution.service';
import { ScoreConfig, ScoreSection, ScoreElement, BonusCondition, PenaltyCondition } from '../utils/prisma-types';

export interface ValidationError {
  type: 'error' | 'warning';
  field: string;
  message: string;
  suggestion?: string;
}

export interface PreviewCalculation {
  elementId: string;
  elementName: string;
  elementCode: string;
  sampleValue: number;
  pointsPerUnit: number;
  calculatedPoints: number;
  category: string;
}

export interface PreviewSection {
  id: string;
  name: string;
  code: string;
  displayOrder: number;
  elements: PreviewCalculation[];
  bonuses: PreviewBonus[];
  penalties: PreviewPenalty[];
  sectionTotal: number;
  formula?: string;
}

export interface PreviewBonus {
  id: string;
  name: string;
  code: string;
  bonusPoints: number;
  condition: string;
  triggered: boolean;
  description: string;
}

export interface PreviewPenalty {
  id: string;
  name: string;
  code: string;
  penaltyPoints: number;
  condition: string;
  triggered: boolean;
  description: string;
}

export interface ScoreConfigPreview {
  configId: string;
  configName: string;
  tournamentId: string;
  validation: {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
  };
  sections: PreviewSection[];
  legacyElements: PreviewCalculation[];
  totalScore: number;
  formula?: string;
  sampleData: Record<string, number>;
  metadata: {
    totalElements: number;
    totalBonuses: number;
    totalPenalties: number;
    hasSections: boolean;
    hasFormula: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Service for generating score configuration previews and validation
 */
@Injectable()
export class ScoreConfigPreviewService {
  private readonly logger = new Logger(ScoreConfigPreviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a complete preview for a score configuration
   */
  async generatePreview(configId: string): Promise<ScoreConfigPreview> {
    this.logger.log(`Generating preview for score config: ${configId}`);

    const config = await this.getScoreConfigWithDetails(configId);
    const validation = this.validateScoreConfig(config);
    const sampleData = this.generateSampleData(config);
    
    const sections = await this.generateSectionPreviews(config, sampleData);
    const legacyElements = this.generateLegacyElementPreviews(config, sampleData);
    
    const totalScore = this.calculateTotalScore(config, sections, legacyElements);

    return {
      configId: config.id,
      configName: config.name,
      tournamentId: config.tournamentId || '',
      validation,
      sections,
      legacyElements,
      totalScore,
      formula: config.totalScoreFormula || undefined,
      sampleData,
      metadata: {
        totalElements: this.countTotalElements(config),
        totalBonuses: this.countTotalBonuses(config),
        totalPenalties: this.countTotalPenalties(config),
        hasSections: (config.scoreSections?.length || 0) > 0,
        hasFormula: !!config.totalScoreFormula,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      }
    };
  }

  /**
   * Validate a score configuration for completeness and correctness
   */
  validateScoreConfig(config: ScoreConfigWithDetails): { isValid: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if config has any scoring elements or sections
    const hasElements = (config.scoreElements?.length || 0) > 0;
    const hasSections = (config.scoreSections?.length || 0) > 0;
    const hasSectionElements = config.scoreSections?.some(section => (section.scoreElements?.length || 0) > 0);

    if (!hasElements && !hasSections) {
      errors.push({
        type: 'error',
        field: 'scoreElements',
        message: 'Score configuration must have either score elements or score sections with elements',
        suggestion: 'Add score elements to the configuration or create sections with elements'
      });
    }

    if (hasSections && !hasSectionElements) {
      warnings.push({
        type: 'warning',
        field: 'scoreSections',
        message: 'Score sections exist but contain no score elements',
        suggestion: 'Add score elements to existing sections or remove empty sections'
      });
    }

    // Validate section codes are unique
    if (config.scoreSections?.length) {
      const sectionCodes = config.scoreSections.map(section => section.code);
      const uniqueSectionCodes = new Set(sectionCodes);
      if (sectionCodes.length !== uniqueSectionCodes.size) {
        errors.push({
          type: 'error',
          field: 'scoreSections.code',
          message: 'Section codes must be unique within the configuration',
          suggestion: 'Ensure each section has a unique code identifier'
        });
      }
    }

    // Validate element codes are unique within sections
    config.scoreSections?.forEach((section, sectionIndex) => {
      if (section.scoreElements?.length) {
        const elementCodes = section.scoreElements.map(element => element.code);
        const uniqueElementCodes = new Set(elementCodes);
        if (elementCodes.length !== uniqueElementCodes.size) {
          errors.push({
            type: 'error',
            field: `scoreSections[${sectionIndex}].scoreElements.code`,
            message: `Duplicate element codes found in section "${section.name}"`,
            suggestion: 'Ensure each element has a unique code within its section'
          });
        }
      }
    });

    // Validate bonus and penalty conditions
    const allConditions = [
      ...(config.bonusConditions || []).map(b => ({ type: 'bonus', name: b.name, condition: b.condition })),
      ...(config.penaltyConditions || []).map(p => ({ type: 'penalty', name: p.name, condition: p.condition })),
    ];

    config.scoreSections?.forEach(section => {
      allConditions.push(
        ...(section.bonusConditions || []).map(b => ({ type: 'bonus', name: b.name, condition: b.condition })),
        ...(section.penaltyConditions || []).map(p => ({ type: 'penalty', name: p.name, condition: p.condition }))
      );
    });

    allConditions.forEach(conditionInfo => {
      const conditionStr = typeof conditionInfo.condition === 'string' ? conditionInfo.condition : String(conditionInfo.condition || '');
      if (!conditionInfo.condition || conditionStr.trim() === '') {
        warnings.push({
          type: 'warning',
          field: `${conditionInfo.type}Conditions`,
          message: `${conditionInfo.type} "${conditionInfo.name}" has no condition specified`,
          suggestion: `Add a condition expression for the ${conditionInfo.type} to make it functional`
        });
      }
    });

    // Validate formula syntax if present
    if (config.totalScoreFormula) {
      try {
        this.validateFormulaSyntax(config.totalScoreFormula, config);
      } catch (error) {
        errors.push({
          type: 'error',
          field: 'totalScoreFormula',
          message: `Invalid formula syntax: ${error.message}`,
          suggestion: 'Check formula syntax and ensure all referenced section codes exist'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate sample calculation data for testing
   */
  generateSampleCalculation(configId: string, customData?: Record<string, number>): Promise<ScoreConfigPreview> {
    this.logger.log(`Generating sample calculation for config: ${configId}`);
    return this.generatePreview(configId);
  }

  /**
   * Get helpful validation messages for configuration issues
   */
  async getValidationMessages(configId: string): Promise<ValidationError[]> {
    const config = await this.getScoreConfigWithDetails(configId);
    const validation = this.validateScoreConfig(config);
    return [...validation.errors, ...validation.warnings];
  }

  private async getScoreConfigWithDetails(configId: string): Promise<ScoreConfigWithDetails> {
    const config = await this.prisma.scoreConfig.findUnique({
      where: { id: configId },
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
      throw new NotFoundException(`Score config with ID ${configId} not found`);
    }

    return config as ScoreConfigWithDetails;
  }

  private generateSampleData(config: ScoreConfigWithDetails): Record<string, number> {
    const sampleData: Record<string, number> = {};

    // Generate sample data for section elements
    config.scoreSections?.forEach(section => {
      section.scoreElements?.forEach(element => {
        sampleData[element.code] = this.generateSampleValue(element);
      });
    });

    // Generate sample data for legacy elements
    config.scoreElements?.forEach(element => {
      sampleData[element.code] = this.generateSampleValue(element);
    });

    return sampleData;
  }

  private generateSampleValue(element: ScoreElement): number {
    // Generate realistic sample values based on element type and points
    const baseValue = Math.abs(element.pointsPerUnit);
    
    if (baseValue >= 20) {
      return Math.floor(Math.random() * 3) + 1; // 1-3 for high-value items
    } else if (baseValue >= 5) {
      return Math.floor(Math.random() * 8) + 2; // 2-9 for medium-value items
    } else {
      return Math.floor(Math.random() * 15) + 5; // 5-19 for low-value items
    }
  }

  private async generateSectionPreviews(config: ScoreConfigWithDetails, sampleData: Record<string, number>): Promise<PreviewSection[]> {
    if (!config.scoreSections?.length) {
      return [];
    }

    return config.scoreSections.map(section => {
      const elements = this.generateElementPreviews(section.scoreElements || [], sampleData);
      const bonuses = this.generateBonusPreviews(section.bonusConditions || [], sampleData);
      const penalties = this.generatePenaltyPreviews(section.penaltyConditions || [], sampleData);
      
      const elementTotal = elements.reduce((sum, el) => sum + el.calculatedPoints, 0);
      const bonusTotal = bonuses.filter(b => b.triggered).reduce((sum, b) => sum + b.bonusPoints, 0);
      const penaltyTotal = penalties.filter(p => p.triggered).reduce((sum, p) => sum + p.penaltyPoints, 0);
      
      const sectionTotal = elementTotal + bonusTotal + penaltyTotal;

      return {
        id: section.id,
        name: section.name,
        code: section.code,
        displayOrder: section.displayOrder,
        elements,
        bonuses,
        penalties,
        sectionTotal,
      };
    });
  }

  private generateLegacyElementPreviews(config: ScoreConfigWithDetails, sampleData: Record<string, number>): PreviewCalculation[] {
    if (!config.scoreElements?.length) {
      return [];
    }

    return this.generateElementPreviews(config.scoreElements, sampleData);
  }

  private generateElementPreviews(elements: ScoreElement[], sampleData: Record<string, number>): PreviewCalculation[] {
    return elements.map(element => {
      const sampleValue = sampleData[element.code] || 0;
      const calculatedPoints = sampleValue * element.pointsPerUnit;

      return {
        elementId: element.id,
        elementName: element.name,
        elementCode: element.code,
        sampleValue,
        pointsPerUnit: element.pointsPerUnit,
        calculatedPoints,
        category: this.determineElementCategory(element.code),
      };
    });
  }

  private generateBonusPreviews(bonuses: BonusCondition[], sampleData: Record<string, number>): PreviewBonus[] {
    return bonuses.map(bonus => {
      const conditionStr = typeof bonus.condition === 'string' ? bonus.condition : String(bonus.condition || '');
      const triggered = this.evaluateSampleCondition(conditionStr, sampleData);
      
      return {
        id: bonus.id,
        name: bonus.name,
        code: bonus.code,
        bonusPoints: bonus.bonusPoints,
        condition: conditionStr,
        triggered,
        description: bonus.description || `Bonus: ${bonus.name}`,
      };
    });
  }

  private generatePenaltyPreviews(penalties: PenaltyCondition[], sampleData: Record<string, number>): PreviewPenalty[] {
    return penalties.map(penalty => {
      const conditionStr = typeof penalty.condition === 'string' ? penalty.condition : String(penalty.condition || '');
      const triggered = this.evaluateSampleCondition(conditionStr, sampleData);
      
      return {
        id: penalty.id,
        name: penalty.name,
        code: penalty.code,
        penaltyPoints: penalty.penaltyPoints,
        condition: conditionStr,
        triggered,
        description: penalty.description || `Penalty: ${penalty.name}`,
      };
    });
  }

  private calculateTotalScore(config: ScoreConfigWithDetails, sections: PreviewSection[], legacyElements: PreviewCalculation[]): number {
    if (config.totalScoreFormula && sections.length > 0) {
      try {
        const sectionScores: Record<string, number> = {};
        sections.forEach(section => {
          sectionScores[section.code] = section.sectionTotal;
        });
        return this.evaluateFormula(config.totalScoreFormula, sectionScores);
      } catch (error) {
        this.logger.warn(`Failed to evaluate formula: ${error.message}`);
        // Fallback to sum
        return sections.reduce((sum, section) => sum + section.sectionTotal, 0);
      }
    }

    // Sum all sections and legacy elements
    const sectionTotal = sections.reduce((sum, section) => sum + section.sectionTotal, 0);
    const legacyTotal = legacyElements.reduce((sum, element) => sum + element.calculatedPoints, 0);
    
    return sectionTotal + legacyTotal;
  }

  private determineElementCategory(elementCode: string): string {
    const code = elementCode.toLowerCase();
    if (code.includes('auto')) return 'autonomous';
    if (code.includes('teleop') || code.includes('driver')) return 'driver-controlled';
    if (code.includes('endgame') || code.includes('end')) return 'endgame';
    return 'general';
  }

  private evaluateSampleCondition(condition: string | null, sampleData: Record<string, number>): boolean {
    if (!condition || condition.trim() === '') {
      return false;
    }

    try {
      // Simple condition evaluation for sample data
      // This is a basic implementation - in a real system you'd want more robust parsing
      const cleanCondition = condition.toLowerCase().trim();
      
      // Handle simple comparisons like "auto_cone >= 3"
      const comparisonMatch = cleanCondition.match(/(\w+)\s*(>=|<=|>|<|=|==)\s*(\d+)/);
      if (comparisonMatch) {
        const [, variable, operator, valueStr] = comparisonMatch;
        const value = parseInt(valueStr);
        const actualValue = sampleData[variable] || 0;
        
        switch (operator) {
          case '>=':	return actualValue >= value;
          case '<=':	return actualValue <= value;
          case '>':	return actualValue > value;
          case '<':	return actualValue < value;
          case '=':
          case '==':	return actualValue === value;
          default: return false;
        }
      }

      // For complex conditions, randomly trigger 30% of the time for demo purposes
      return Math.random() < 0.3;
    } catch (error) {
      this.logger.warn(`Failed to evaluate condition "${condition}": ${error.message}`);
      return false;
    }
  }

  private validateFormulaSyntax(formula: string, config: ScoreConfigWithDetails): void {
    if (!formula || formula.trim() === '') {
      throw new Error('Formula cannot be empty');
    }

    // Check that all referenced section codes exist
    const sectionCodes = config.scoreSections?.map(s => s.code) || [];
    const referencedCodes = formula.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    
    const invalidCodes = referencedCodes.filter(code => 
      !sectionCodes.includes(code) && 
      !['SUM', 'MAX', 'MIN', 'AVG'].includes(code.toUpperCase())
    );

    if (invalidCodes.length > 0) {
      throw new Error(`Formula references unknown section codes: ${invalidCodes.join(', ')}`);
    }

    // Basic syntax validation
    const invalidChars = formula.match(/[^a-zA-Z0-9_+\-*/().\s]/g);
    if (invalidChars) {
      throw new Error(`Formula contains invalid characters: ${invalidChars.join(', ')}`);
    }
  }

  private evaluateFormula(formula: string, variables: Record<string, number>): number {
    try {
      // Simple formula evaluation - replace variables with values
      let evaluableFormula = formula;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluableFormula = evaluableFormula.replace(regex, value.toString());
      });

      // Use Function constructor for safe evaluation (basic math only)
      const result = new Function(`return ${evaluableFormula}`)();
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      this.logger.warn(`Formula evaluation failed: ${error.message}`);
      return 0;
    }
  }

  private countTotalElements(config: ScoreConfigWithDetails): number {
    const sectionElements = config.scoreSections?.reduce((sum, section) => 
      sum + (section.scoreElements?.length || 0), 0) || 0;
    const legacyElements = config.scoreElements?.length || 0;
    return sectionElements + legacyElements;
  }

  private countTotalBonuses(config: ScoreConfigWithDetails): number {
    const sectionBonuses = config.scoreSections?.reduce((sum, section) => 
      sum + (section.bonusConditions?.length || 0), 0) || 0;
    const legacyBonuses = config.bonusConditions?.length || 0;
    return sectionBonuses + legacyBonuses;
  }

  private countTotalPenalties(config: ScoreConfigWithDetails): number {
    const sectionPenalties = config.scoreSections?.reduce((sum, section) => 
      sum + (section.penaltyConditions?.length || 0), 0) || 0;
    const legacyPenalties = config.penaltyConditions?.length || 0;
    return sectionPenalties + legacyPenalties;
  }
}
