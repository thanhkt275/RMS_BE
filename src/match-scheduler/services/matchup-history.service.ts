import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AllianceColor } from '../../utils/prisma-types';

/**
 * Service for tracking and avoiding repeat matchups in tournaments
 * Implements Single Responsibility Principle by focusing only on matchup history
 */
@Injectable()
export class MatchupHistoryService {
  
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets previous opponents for each team in a stage
   * @param stageId Stage ID to analyze
   * @returns Map of team ID to set of opponent team IDs
   */
  async getPreviousOpponents(stageId: string): Promise<Map<string, Set<string>>> {
    const previousMatches = await this.prisma.match.findMany({
      where: { stageId },
      include: {
        alliances: {
          include: {
            teamAlliances: true
          }
        }
      }
    });

    const previousOpponents = new Map<string, Set<string>>();

    for (const match of previousMatches) {
      if (!match.alliances || match.alliances.length < 2) continue;

      const redTeams = match.alliances
        .find(a => a.color === AllianceColor.RED)?.teamAlliances
        .map(ta => ta.teamId) || [];
      
      const blueTeams = match.alliances
        .find(a => a.color === AllianceColor.BLUE)?.teamAlliances
        .map(ta => ta.teamId) || [];

      // Record opponents for each team
      [...redTeams, ...blueTeams].forEach(teamId => {
        if (!previousOpponents.has(teamId)) {
          previousOpponents.set(teamId, new Set<string>());
        }
        const opponents = previousOpponents.get(teamId)!;

        // Add all other teams in this match as opponents
        [...redTeams, ...blueTeams].forEach(otherTeamId => {
          if (otherTeamId !== teamId) {
            opponents.add(otherTeamId);
          }
        });
      });
    }

    return previousOpponents;
  }

  /**
   * Calculates repeat matchup penalty for a potential alliance assignment
   * @param redTeams Teams assigned to red alliance
   * @param blueTeams Teams assigned to blue alliance
   * @param previousOpponents Previous opponent tracking
   * @returns Number of repeat matchups (penalty score)
   */
  calculateRepeatMatchupPenalty(
    redTeams: any[],
    blueTeams: any[],
    previousOpponents: Map<string, Set<string>>
  ): number {
    let penalty = 0;
    
    for (const redTeam of redTeams) {
      for (const blueTeam of blueTeams) {
        if (previousOpponents.get(redTeam.teamId)?.has(blueTeam.teamId)) {
          penalty++;
        }
      }
    }
    
    return penalty;
  }

  /**
   * Optimizes alliance assignment to minimize repeat matchups
   * @param matchTeams All teams for the match
   * @param previousOpponents Previous opponent tracking
   * @param teamsPerAlliance Number of teams per alliance
   * @returns Optimized alliance assignment [redTeams, blueTeams]
   */
  optimizeAllianceAssignment(
    matchTeams: any[],
    previousOpponents: Map<string, Set<string>>,
    teamsPerAlliance: number = 2
  ): [any[], any[]] {
    const totalTeams = teamsPerAlliance * 2;
    
    if (matchTeams.length !== totalTeams) {
      throw new Error(`Expected ${totalTeams} teams for match, got ${matchTeams.length}`);
    }

    // Default assignment: first half red, second half blue
    const defaultRed = matchTeams.slice(0, teamsPerAlliance);
    const defaultBlue = matchTeams.slice(teamsPerAlliance, totalTeams);
    
    let bestRed = defaultRed;
    let bestBlue = defaultBlue;
    let lowestPenalty = this.calculateRepeatMatchupPenalty(defaultRed, defaultBlue, previousOpponents);

    // Try alternative assignments for 4-team matches
    if (matchTeams.length === 4) {
      const alternatives = [
        { red: [matchTeams[0], matchTeams[2]], blue: [matchTeams[1], matchTeams[3]] },
        { red: [matchTeams[0], matchTeams[3]], blue: [matchTeams[1], matchTeams[2]] }
      ];

      for (const alt of alternatives) {
        const penalty = this.calculateRepeatMatchupPenalty(alt.red, alt.blue, previousOpponents);
        if (penalty < lowestPenalty) {
          lowestPenalty = penalty;
          bestRed = alt.red;
          bestBlue = alt.blue;
        }
      }
    }

    return [bestRed, bestBlue];
  }
}
