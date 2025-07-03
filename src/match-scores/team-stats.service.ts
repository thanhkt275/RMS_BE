import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MatchState } from '../utils/prisma-types';
import { ITeamStatsService } from './interfaces/team-stats.interface';

@Injectable()
export class TeamStatsService implements ITeamStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateTeamStats(match: any, teamIds: string[]): Promise<void> {
    console.log(`🔄 TeamStatsService.recalculateTeamStats called for ${teamIds.length} teams in tournament ${match?.stage?.tournament?.id}, stage ${match?.stage?.id}`);
    if (!match || !teamIds.length) return;
    const allTeamMatches = await this.prisma.match.findMany({
      where: {
        stage: { tournamentId: match.stage.tournament.id },
        alliances: {
          some: {
            teamAlliances: {
              some: { teamId: { in: teamIds }, isSurrogate: false },
            },
          },
        },
        status: MatchState.COMPLETED,
      },
      include: {
        alliances: {
          include: {
            teamAlliances: { where: { teamId: { in: teamIds } } },
            matchScores: true, // Include match scores to calculate total score
          },
        },
      },
    });
    
    console.log(`🔍 TeamStatsService found ${allTeamMatches.length} completed matches for ${teamIds.length} teams in tournament ${match?.stage?.tournament?.id}`);
    const matchesByTeam = new Map<string, any[]>();
    teamIds.forEach(teamId => matchesByTeam.set(teamId, []));
    for (const teamMatch of allTeamMatches) {
      for (const alliance of teamMatch.alliances) {
        for (const teamAlliance of alliance.teamAlliances) {
          const matches = matchesByTeam.get(teamAlliance.teamId) || [];
          matches.push({ ...teamMatch, teamAllianceColor: alliance.color });
          matchesByTeam.set(teamAlliance.teamId, matches);
        }
      }
    }    const statsUpdates: Promise<any>[] = [];
    for (const [teamId, teamMatches] of matchesByTeam.entries()) {
      let wins = 0, losses = 0, ties = 0;
      let pointsScored = 0, pointsConceded = 0;
      const matchesPlayed = teamMatches.length;
      
      for (const teamMatch of teamMatches) {
        // Calculate wins/losses/ties
        console.log(`🔍 TeamStatsService processing match ${teamMatch.id} for team ${teamId}:`, {
          status: teamMatch.status,
          winningAlliance: teamMatch.winningAlliance,
          teamAllianceColor: teamMatch.teamAllianceColor
        });
        
        if (teamMatch.winningAlliance === null) ties++; // null means tie
        else if (teamMatch.winningAlliance === teamMatch.teamAllianceColor) wins++;
        else losses++;
        
        console.log(`🔍 TeamStatsService match ${teamMatch.id} result for team ${teamId}:`, {
          wins, losses, ties, 
          resultThisMatch: teamMatch.winningAlliance === null ? 'TIE' : 
                          teamMatch.winningAlliance === teamMatch.teamAllianceColor ? 'WIN' : 'LOSS'
        });
        
        // Calculate points scored and conceded
        const teamAlliance = teamMatch.alliances.find((a: any) => a.color === teamMatch.teamAllianceColor);
        const opponentAlliance = teamMatch.alliances.find((a: any) => a.color !== teamMatch.teamAllianceColor);
        
        if (teamAlliance) {
          // Try to get score from alliance, or calculate from matchScores
          let allianceScore = teamAlliance.score || 0;
          if (allianceScore === 0 && teamAlliance.matchScores && teamAlliance.matchScores.length > 0) {
            // Calculate total from match scores if score is not set
            allianceScore = teamAlliance.matchScores.reduce((total: number, score: any) => total + (score.totalPoints || score.score || 0), 0);
          }
          pointsScored += allianceScore;
          console.log(`🔍 Team ${teamId} alliance score in match ${teamMatch.id}:`, allianceScore, 'from score:', teamAlliance.score, 'matchScores:', teamAlliance.matchScores?.length);
        }
        if (opponentAlliance) {
          // Try to get score from alliance, or calculate from matchScores
          let opponentScore = opponentAlliance.score || 0;
          if (opponentScore === 0 && opponentAlliance.matchScores && opponentAlliance.matchScores.length > 0) {
            // Calculate total from match scores if score is not set
            opponentScore = opponentAlliance.matchScores.reduce((total: number, score: any) => total + (score.totalPoints || score.score || 0), 0);
          }
          pointsConceded += opponentScore;
          console.log(`🔍 Team ${teamId} opponent score in match ${teamMatch.id}:`, opponentScore, 'from score:', opponentAlliance.score, 'matchScores:', opponentAlliance.matchScores?.length);
        }
      }
      
      const pointDifferential = pointsScored - pointsConceded;
      
      // Calculate additional statistics
      const winPercentage = matchesPlayed > 0 ? wins / matchesPlayed : 0;
      const rankingPoints = (wins * 2) + ties; // Standard FRC ranking: 2 points for win, 1 for tie
      
      // Calculate opponent win percentage (tiebreaker)
      let opponentWinPercentage = 0;
      if (teamMatches.length > 0) {
        const opponentStats = await this.calculateOpponentWinPercentage(teamMatches, match.stage.tournament.id);
        opponentWinPercentage = opponentStats;
      }
      
      // Tiebreakers (can be customized based on game rules)
      const tiebreaker1 = pointsScored; // Total points as first tiebreaker
      const tiebreaker2 = pointDifferential; // Point differential as second tiebreaker
      
      // Debug logging
      console.log(`🔍 TeamStatsService calculating stats for team ${teamId}:`, {
        wins, losses, ties, matchesPlayed,
        pointsScored, pointsConceded, pointDifferential,
        rankingPoints, opponentWinPercentage,
        tiebreaker1, tiebreaker2,
        tournamentId: match.stage.tournament.id,
        stageId: match.stage.id
      });
      
      statsUpdates.push(
        this.prisma.teamStats.upsert({
          where: { teamId_tournamentId: { teamId, tournamentId: match.stage.tournament.id } },
          create: { 
            teamId, 
            tournamentId: match.stage.tournament.id,
            stageId: match.stage.id, // Include stageId for consistency with SwissScheduler
            wins, 
            losses, 
            ties, 
            matchesPlayed,
            pointsScored,
            pointsConceded,
            pointDifferential,
            rankingPoints,
            opponentWinPercentage,
            tiebreaker1,
            tiebreaker2
          },
          update: { 
            stageId: match.stage.id, // Update stageId to match current stage
            wins, 
            losses, 
            ties, 
            matchesPlayed,
            pointsScored,
            pointsConceded,
            pointDifferential,
            rankingPoints,
            opponentWinPercentage,
            tiebreaker1,
            tiebreaker2
          },
        })
      );
    }
    await Promise.all(statsUpdates);
  }

  /**
   * Calculate the opponent win percentage for tiebreaker purposes
   */
  private async calculateOpponentWinPercentage(teamMatches: any[], tournamentId: string): Promise<number> {
    const opponentTeamIds = new Set<string>();
    
    // Collect all opponent team IDs
    for (const teamMatch of teamMatches) {
      const opponentAlliance = teamMatch.alliances.find((a: any) => a.color !== teamMatch.teamAllianceColor);
      if (opponentAlliance) {
        for (const teamAlliance of opponentAlliance.teamAlliances) {
          opponentTeamIds.add(teamAlliance.teamId);
        }
      }
    }
    
    if (opponentTeamIds.size === 0) return 0;
    
    // Get stats for all opponent teams
    const opponentStats = await this.prisma.teamStats.findMany({
      where: {
        teamId: { in: Array.from(opponentTeamIds) },
        tournamentId
      }
    });
    
    // Calculate average win percentage of opponents
    let totalWinPercentage = 0;
    let validOpponents = 0;
    
    for (const stat of opponentStats) {
      if (stat.matchesPlayed > 0) {
        const winPercentage = stat.wins / stat.matchesPlayed;
        totalWinPercentage += winPercentage;
        validOpponents++;
      }
    }
    
    return validOpponents > 0 ? totalWinPercentage / validOpponents : 0;
  }
}
