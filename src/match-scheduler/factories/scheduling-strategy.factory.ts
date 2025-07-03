import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ISchedulingStrategy, SchedulingOptions } from '../interfaces/scheduling-strategy.interface';
import { Stage, Match } from '../../utils/prisma-types';

/**
 * Factory for creating scheduling strategies
 * Implements the Factory pattern to create appropriate scheduling strategies
 */
@Injectable()
export class SchedulingStrategyFactory {
  
  constructor(private readonly strategies: ISchedulingStrategy[]) {}

  /**
   * Creates the appropriate scheduling strategy for a given stage
   * @param stage The stage to create a strategy for
   * @returns The appropriate scheduling strategy
   * @throws NotFoundException if no suitable strategy is found
   */
  createStrategy(stage: Stage): ISchedulingStrategy {
    const strategy = this.strategies.find(s => s.canHandle(stage));
    
    if (!strategy) {
      throw new NotFoundException(`No scheduling strategy found for stage type: ${stage.type}`);
    }
    
    return strategy;
  }

  /**
   * Gets all available strategy types
   * @returns Array of strategy type names
   */
  getAvailableStrategyTypes(): string[] {
    return this.strategies.map(s => s.getStrategyType());
  }

  /**
   * Validates if a strategy can handle a specific stage
   * @param stage The stage to validate
   * @param strategyType Optional specific strategy type to check
   * @returns True if a suitable strategy exists
   */
  canHandleStage(stage: Stage, strategyType?: string): boolean {
    if (strategyType) {
      const strategy = this.strategies.find(s => s.getStrategyType() === strategyType);
      return strategy ? strategy.canHandle(stage) : false;
    }
    
    return this.strategies.some(s => s.canHandle(stage));
  }
}
