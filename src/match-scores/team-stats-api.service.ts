import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TeamStatsService } from './team-stats.service';
import { TeamStatsFilterDto } from './dto/team-stats-filter.dto';
import { TeamStatsResponseDto } from './dto/team-stats-response.dto';
import { LeaderboardResponseDto, LeaderboardEntryDto } from './dto/leaderboard-response.dto';

@Injectable()
export class TeamStatsApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamStatsService: TeamStatsService
  ) {}

  async getTeamStats(teamId: string, tournamentId?: string, stageId?: string): Promise<TeamStatsResponseDto[]> {
    const where: any = { teamId };
    if (tournamentId) where.tournamentId = tournamentId;
    if (stageId) where.stageId = stageId;
    const stats = await this.prisma.teamStats.findMany({
      where,
      include: {
        team: true,
        tournament: true,
        stage: true,
      },
    });
    return stats.map(this.toDto);
  }

  async getStatsForTournament(tournamentId: string, filter?: TeamStatsFilterDto): Promise<TeamStatsResponseDto[]> {
    const where: any = { tournamentId };
    if (filter?.teamName) where.team = { name: { contains: filter.teamName, mode: 'insensitive' } };
    if (filter?.teamNumber) where.team = { ...(where.team || {}), teamNumber: { contains: filter.teamNumber, mode: 'insensitive' } };
    if (filter?.minWins !== undefined) where.wins = { gte: filter.minWins };
    if (filter?.maxWins !== undefined) where.wins = { ...(where.wins || {}), lte: filter.maxWins };
    if (filter?.minRank !== undefined) where.rank = { gte: filter.minRank };
    if (filter?.maxRank !== undefined) where.rank = { ...(where.rank || {}), lte: filter.maxRank };
    if (filter?.minScore !== undefined) where.pointsScored = { gte: filter.minScore };
    if (filter?.maxScore !== undefined) where.pointsScored = { ...(where.pointsScored || {}), lte: filter.maxScore };
    // Fix: Prisma expects 'asc' | 'desc' not string
    let orderBy: any = undefined;
    if (filter?.sortBy) {
      orderBy = { [filter.sortBy]: filter.sortDir === 'desc' ? 'desc' : 'asc' };
    } else {
      orderBy = { rank: 'asc' };
    }
    const stats = await this.prisma.teamStats.findMany({
      where,
      include: {
        team: true,
        tournament: true,
        stage: true,
      },
      orderBy,
      skip: filter?.offset,
      take: filter?.limit,
    });
    return stats.map(this.toDto);
  }

  async getLeaderboard(tournamentId: string, filter?: TeamStatsFilterDto): Promise<LeaderboardResponseDto> {
    const stats = await this.getStatsForTournament(tournamentId, filter);
    const tournament = stats[0]?.tournamentName || '';
    // Calculate highestScore for each team (use pointsScored as the highest for now, or extend if you have per-match data)
    const rankings = stats.map((s, i) => ({
      ...s,
      position: i + 1,
      highestScore: s.pointsScored, // You can replace this with the real highest if you have per-match breakdown
      totalScore: s.pointsScored,   // Alias for clarity in frontend
    }));
    return {
      tournamentId,
      tournamentName: tournament,
      totalTeams: rankings.length,
      rankings,
    };
  }

  private toDto = (stat: any): TeamStatsResponseDto => {
    const winPercentage = stat.matchesPlayed > 0 ? stat.wins / stat.matchesPlayed : 0;
    const avgPointsScored = stat.matchesPlayed > 0 ? stat.pointsScored / stat.matchesPlayed : 0;
    const avgPointsConceded = stat.matchesPlayed > 0 ? stat.pointsConceded / stat.matchesPlayed : 0;
    return {
      id: stat.id,
      teamId: stat.teamId,
      teamNumber: stat.team?.teamNumber || '',
      teamName: stat.team?.name || '',
      organization: stat.team?.organization,
      tournamentId: stat.tournamentId,
      tournamentName: stat.tournament?.name || '',
      stageId: stat.stageId,
      stageName: stat.stage?.name,
      wins: stat.wins,
      losses: stat.losses,
      ties: stat.ties,
      pointsScored: stat.pointsScored,
      pointsConceded: stat.pointsConceded,
      matchesPlayed: stat.matchesPlayed,
      rankingPoints: stat.rankingPoints,
      opponentWinPercentage: stat.opponentWinPercentage,
      pointDifferential: stat.pointDifferential,
      rank: stat.rank,
      tiebreaker1: stat.tiebreaker1,
      tiebreaker2: stat.tiebreaker2,
      winPercentage,
      avgPointsScored,
      avgPointsConceded,
    };
  };

  /**
   * Calculates rankings for all teams in a tournament (optionally by stage) and writes them to the database.
   * Ranking is by FRC standard rules: ranking points desc, opponent win percentage desc, point differential desc.
   * Updates the 'rank' field in teamStats for each team.
   */
  async calculateAndWriteRankings(tournamentId: string, stageId?: string): Promise<void> {
    const where: any = { tournamentId };
    if (stageId) where.stageId = stageId;
    const stats = await this.prisma.teamStats.findMany({
      where,
      include: { team: true }
    });
    
    // Sort by FRC ranking rules: ranking points desc, then opponent win percentage desc, then point differential desc
    const sorted = stats.slice().sort((a, b) => {
      if (b.rankingPoints !== a.rankingPoints) return b.rankingPoints - a.rankingPoints;
      if (b.opponentWinPercentage !== a.opponentWinPercentage) return b.opponentWinPercentage - a.opponentWinPercentage;
      if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
      return b.pointsScored - a.pointsScored; // Final tiebreaker: total points scored
    });
    
    console.log(`🏆 Updating rankings for ${sorted.length} teams in tournament ${tournamentId}:`, 
      sorted.slice(0, 5).map(s => ({ 
        team: s.team.name, 
        rankingPoints: s.rankingPoints, 
        wins: s.wins, 
        losses: s.losses, 
        ties: s.ties 
      }))
    );
    
    // Assign and write ranks
    for (let i = 0; i < sorted.length; i++) {
      const stat = sorted[i];
      const rank = i + 1;
      await this.prisma.teamStats.update({
        where: { id: stat.id },
        data: { rank }
      });
    }
  }

  /**
   * Manually recalculate all team stats for a tournament by processing all completed matches
   * @param tournamentId - The tournament ID
   * @param stageId - Optional stage ID to limit recalculation to a specific stage
   * @returns Object with recalculation results
   */
  async recalculateAllTeamStats(
    tournamentId: string, 
    stageId?: string
  ): Promise<{ message: string; recalculatedCount: number }> {
    try {
      const scope = stageId ? `stage ${stageId}` : `tournament ${tournamentId}`;
      console.log(`🔄 Recalculating team stats for ${scope}`);
      
      // Build where clause based on parameters
      const whereClause: any = {
        stage: { tournamentId },
        status: 'COMPLETED'
      };
      
      if (stageId) {
        whereClause.stageId = stageId;
      }
      
      console.log(`🔍 Query where clause:`, JSON.stringify(whereClause, null, 2));
    
    // Get all completed matches for this tournament/stage
    const completedMatches = await this.prisma.match.findMany({
      where: whereClause,
      include: {
        stage: {
          include: { tournament: true }
        },
        alliances: {
          include: {
            teamAlliances: {
              include: { team: true }
            },
            matchScores: true
          }
        }
      }
    });

    console.log(`🔍 Found ${completedMatches.length} completed matches in ${scope}`);

    if (completedMatches.length === 0) {
      console.log(`⚠️ No completed matches found for ${scope}. Check if matches exist and are marked as COMPLETED.`);
      return {
        message: `No completed matches found for ${scope}`,
        recalculatedCount: 0
      };
    }

    // Debug: Show details of first few matches
    console.log(`🔍 Sample match details:`, completedMatches.slice(0, 2).map(m => ({
      id: m.id,
      status: m.status,
      allianceCount: m.alliances?.length,
      hasMatchScores: m.alliances?.some(a => a.matchScores?.length > 0),
      allianceScores: m.alliances?.map(a => ({ color: a.color, score: a.score, matchScoreCount: a.matchScores?.length || 0 })),
      winningAlliance: m.winningAlliance
    })));

    // Clear existing stats for this tournament/stage
    const deleteWhere: any = { tournamentId };
    if (stageId) {
      deleteWhere.stageId = stageId;
    }
    
    const deletedStats = await this.prisma.teamStats.deleteMany({
      where: deleteWhere
    });
    
    console.log(`🗑️ Cleared ${deletedStats.count} existing team stats records`);

    // Collect all unique teams from all matches
    const allTeamIds = new Set<string>();
    for (const match of completedMatches) {
      for (const alliance of match.alliances) {
        for (const teamAlliance of alliance.teamAlliances) {
          if (!teamAlliance.isSurrogate) {
            allTeamIds.add(teamAlliance.teamId);
          }
        }
      }
    }

    console.log(`🔄 Processing ${allTeamIds.size} unique teams from ${completedMatches.length} matches`);

    // Use the first match to get tournament/stage info (all matches are from same tournament/stage)
    if (completedMatches.length > 0) {
      const sampleMatch = completedMatches[0];
      await this.teamStatsService.recalculateTeamStats(
        sampleMatch, 
        Array.from(allTeamIds)
      );
    }

    // After all stats are recalculated, update rankings
    await this.calculateAndWriteRankings(tournamentId, stageId);
    
    const message = `Successfully recalculated team statistics for ${allTeamIds.size} teams in ${scope}`;
    console.log(`✅ ${message}`);
    
    return {
      message,
      recalculatedCount: allTeamIds.size
    };
    
    } catch (error) {
      console.error(`❌ Error recalculating team stats for ${tournamentId}:`, error);
      throw error;
    }
  }

  /**
   * Debug method to check tournament data
   */
  async debugTournamentData(tournamentId: string, stageId?: string) {
    const whereClause: any = {
      stage: { tournamentId }
    };
    
    if (stageId) {
      whereClause.stageId = stageId;
    }
    
    const allMatches = await this.prisma.match.findMany({
      where: whereClause,
      include: {
        stage: { select: { name: true, type: true } },
        alliances: {
          include: {
            teamAlliances: { include: { team: { select: { name: true, teamNumber: true } } } },
            matchScores: true
          }
        }
      }
    });
    
    const completedMatches = allMatches.filter(m => m.status === 'COMPLETED');
    
    // Get current team stats
    const currentTeamStats = await this.prisma.teamStats.findMany({
      where: { tournamentId, ...(stageId ? { stageId } : {}) },
      include: { team: { select: { name: true, teamNumber: true } } },
      orderBy: { rankingPoints: 'desc' }
    });
    
    const summary = {
      tournamentId,
      stageId,
      totalMatches: allMatches.length,
      completedMatches: completedMatches.length,
      matchStatusBreakdown: allMatches.reduce((acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      currentTeamStats: currentTeamStats.map(ts => ({
        teamNumber: ts.team.teamNumber,
        teamName: ts.team.name,
        wins: ts.wins,
        losses: ts.losses,
        ties: ts.ties,
        rankingPoints: ts.rankingPoints,
        matchesPlayed: ts.matchesPlayed,
        pointsScored: ts.pointsScored,
        pointsConceded: ts.pointsConceded
      })),
      sampleMatches: completedMatches.slice(0, 3).map(m => ({
        id: m.id,
        status: m.status,
        stage: m.stage.name,
        winningAlliance: m.winningAlliance,
        alliances: m.alliances.map(a => ({
          color: a.color,
          score: a.score,
          autoScore: a.autoScore,
          driveScore: a.driveScore,
          teams: a.teamAlliances.map(ta => `${ta.team.teamNumber} (${ta.team.name})`),
          matchScoreCount: a.matchScores?.length || 0,
          matchScoreSample: a.matchScores?.slice(0, 2).map(ms => ({ totalPoints: ms.totalPoints, units: ms.units }))
        }))
      }))
    };
    
    console.log(`🔍 Debug data for tournament ${tournamentId}:`, JSON.stringify(summary, null, 2));
    return summary;
  }
}
