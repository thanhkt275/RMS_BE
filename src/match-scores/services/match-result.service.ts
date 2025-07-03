import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AllianceColor } from '../../utils/prisma-types';

/**
 * Service responsible for updating match results

 */
@Injectable()
export class MatchResultService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Updates the winning alliance for a match
   */
  async updateMatchWinner(matchId: string, winningAlliance: AllianceColor | null): Promise<void> {
    await this.prisma.match.update({
      where: { id: matchId },
      data: { winningAlliance },
    });
  }

  /**
   * Resets match winner
   */
  async resetMatchWinner(matchId: string): Promise<void> {
    await this.updateMatchWinner(matchId, null);
  }

  /**
   * Gets match with detailed information for team stats calculation
   */
  async getMatchWithDetails(matchId: string) {
    return this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        stage: { include: { tournament: true } },
        alliances: {
          include: {
            teamAlliances: { where: { isSurrogate: false } }
          }
        }
      }
    });
  }

  /**
   * Extracts team IDs from match details
   */
  extractTeamIds(matchWithDetails: any): string[] {
    return matchWithDetails.alliances.flatMap(
      (alliance: any) => alliance.teamAlliances.map((ta: any) => ta.teamId)
    );
  }
}
