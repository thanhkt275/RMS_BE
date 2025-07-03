import { Match, Stage, Team } from '../../utils/prisma-types';

/**
 * Interface for tournament scheduling strategies
 * Follows the Strategy pattern for different tournament formats
 */
export interface ISchedulingStrategy {
  /**
   * Generate matches for a specific tournament format
   * @param stage The stage to generate matches for
   * @param options Additional options specific to the strategy
   */
  generateMatches(stage: Stage & { tournament: any; teams: Team[] }, options: any): Promise<Match[]>;

  /**
   * Validate if the strategy can be applied to the given stage
   * @param stage The stage to validate
   */
  canHandle(stage: Stage): boolean;

  /**
   * Get the strategy name/type
   */
  getStrategyType(): string;
}

/**
 * Options for Swiss tournament scheduling
 */
export interface SwissSchedulingOptions {
  currentRoundNumber: number;
  teamsPerAlliance?: number;
  minMatchSeparation?: number;
}

/**
 * Options for FRC tournament scheduling
 */
export interface FrcSchedulingOptions {
  rounds: number;
  teamsPerAlliance?: number;
  minMatchSeparation?: number;
  maxIterations?: number;
  qualityLevel?: 'low' | 'medium' | 'high';
}

/**
 * Options for playoff tournament scheduling
 */
export interface PlayoffSchedulingOptions {
  numberOfRounds: number;
  teamsPerAlliance?: number;
}

/**
 * Generic scheduling options
 */
export type SchedulingOptions = SwissSchedulingOptions | FrcSchedulingOptions | PlayoffSchedulingOptions;
