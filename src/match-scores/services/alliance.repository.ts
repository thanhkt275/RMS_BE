import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AllianceColor } from '../../utils/prisma-types';
import { AllianceScores } from './score-calculation.service';

export interface AllianceData {
  id: string;
  color: AllianceColor;
  autoScore: number;
  driveScore: number;
  totalScore: number;
}

/**
 * Repository service for alliance data operations

 */
@Injectable()
export class AllianceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets alliances for a match
   */
  async getAlliancesForMatch(matchId: string): Promise<AllianceData[]> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { alliances: true },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    return match.alliances.map(alliance => ({
      id: alliance.id,
      color: alliance.color,
      autoScore: alliance.autoScore || 0,
      driveScore: alliance.driveScore || 0,
      totalScore: alliance.score || 0,
    }));
  }

  /**
   * Gets specific alliance by color for a match
   */
  async getAllianceByColor(matchId: string, color: AllianceColor): Promise<AllianceData> {
    const alliances = await this.getAlliancesForMatch(matchId);
    const alliance = alliances.find(a => a.color === color);
    
    if (!alliance) {
      throw new BadRequestException(`${color} alliance not found for match ${matchId}`);
    }
    
    return alliance;
  }

  /**
   * Updates alliance scores
   */
  async updateAllianceScores(allianceId: string, scores: AllianceScores): Promise<void> {
    await this.prisma.alliance.update({
      where: { id: allianceId },
      data: {
        autoScore: scores.autoScore,
        driveScore: scores.driveScore,
        score: scores.totalScore,
      },
    });
  }

  /**
   * Resets all alliance scores for a match
   */
  async resetAllianceScores(matchId: string): Promise<void> {
    await this.prisma.alliance.updateMany({
      where: { matchId },
      data: {
        score: 0,
        autoScore: 0,
        driveScore: 0,
      },
    });
  }

  /**
   * Validates that match has required alliances
   */
  async validateMatchAlliances(matchId: string): Promise<{ red: AllianceData; blue: AllianceData }> {
    const alliances = await this.getAlliancesForMatch(matchId);
    
    const redAlliance = alliances.find(a => a.color === AllianceColor.RED);
    const blueAlliance = alliances.find(a => a.color === AllianceColor.BLUE);

    if (!redAlliance || !blueAlliance) {
      throw new BadRequestException('Match must have both RED and BLUE alliances');
    }

    return { red: redAlliance, blue: blueAlliance };
  }

  /**
   * Gets all matches with their alliances
   */
  async getAllMatchesWithAlliances(): Promise<{ matchId: string; alliances: AllianceData[] }[]> {
    const matches = await this.prisma.match.findMany({
      include: { alliances: true },
    });

    return matches.map(match => ({
      matchId: match.id,
      alliances: match.alliances.map(alliance => ({
        id: alliance.id,
        color: alliance.color,
        autoScore: alliance.autoScore || 0,
        driveScore: alliance.driveScore || 0,
        totalScore: alliance.score || 0,
      })),
    }));
  }
}
