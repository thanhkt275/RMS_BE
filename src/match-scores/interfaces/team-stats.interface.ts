/**
 * Interface for team statistics operations
 * Follows Dependency Inversion Principle - depends on abstraction, not concrete implementation
 */
export interface ITeamStatsService {
  /**
   * Recalculates team statistics after a match score update
   */
  recalculateTeamStats(matchWithDetails: any, teamIds: string[]): Promise<void>;
}
