import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Match as PrismaMatch, AllianceColor, MatchState } from '../utils/prisma-types';

/**
 * Swiss-style round generation and ranking logic.
 * Extracted from MatchSchedulerService for separation of concerns.
 */
@Injectable()
export class SwissScheduler {
  constructor(private readonly prisma: PrismaService) {}

  async updateSwissRankings(stageId: string): Promise<void> {
    console.log(`🔄 SwissScheduler.updateSwissRankings called for stage ${stageId}`);
    let teamStats = await this.prisma.teamStats.findMany({
      where: { stageId },
      include: { team: true }
    });
    const matches = await this.prisma.match.findMany({
      where: { stageId },
      include: {
        alliances: { include: { teamAlliances: true } },
        matchScores: true
      }
    });
    
    console.log(`🔍 SwissScheduler found ${matches.length} matches for stage ${stageId}`);
    console.log(`🔍 Match status breakdown:`, matches.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));
    
    const completedMatches = matches.filter(m => m.status === MatchState.COMPLETED);
    console.log(`🔍 Processing ${completedMatches.length} completed matches out of ${matches.length} total matches`);
    if (teamStats.length === 0) {
      const stageObj = await this.prisma.stage.findUnique({
        where: { id: stageId },
        include: { tournament: { include: { teams: true } } }
      });
      if (stageObj?.tournament?.teams) {
        for (const team of stageObj.tournament.teams) {
          const existing = await this.prisma.teamStats.findUnique({
            where: { teamId_tournamentId: { teamId: team.id, tournamentId: stageObj.tournament.id } }
          });
          if (existing && !existing.stageId) {
            await this.prisma.teamStats.update({
              where: { teamId_tournamentId: { teamId: team.id, tournamentId: stageObj.tournament.id } },
              data: { stageId }
            });
          } else if (!existing) {
            await this.prisma.teamStats.create({
              data: {
                teamId: team.id,
                tournamentId: stageObj.tournament.id,
                stageId,
                wins: 0,
                losses: 0,
                ties: 0,
                pointsScored: 0,
                pointsConceded: 0,
                matchesPlayed: 0,
                rankingPoints: 0,
                opponentWinPercentage: 0,
                pointDifferential: 0,
                tiebreaker1: 0,
                tiebreaker2: 0
              }
            });
          }
        }
        teamStats = await this.prisma.teamStats.findMany({
          where: { stageId },
          include: { team: true }
        });
      } else {
        return;
      }
    }
    const teamResults = new Map<string, {
      wins: number,
      losses: number,
      ties: number,
      pointsScored: number,
      pointsConceded: number,
      opponents: Set<string>
    }>();
    for (const stats of teamStats) {
      teamResults.set(stats.teamId, {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsScored: 0,
        pointsConceded: 0,
        opponents: new Set<string>()
      });
    }
    for (const match of completedMatches) {      const redTeams = match.alliances.find(a => a.color === AllianceColor.RED)?.teamAlliances.map(ta => ta.teamId) ?? [];
      const blueTeams = match.alliances.find(a => a.color === AllianceColor.BLUE)?.teamAlliances.map(ta => ta.teamId) ?? [];
      
      // Calculate scores - try multiple sources
      const redAlliance = match.alliances.find(a => a.color === AllianceColor.RED);
      const blueAlliance = match.alliances.find(a => a.color === AllianceColor.BLUE);
      
      // Try to get scores from alliance.score first, then from matchScores
      let scoreRed = redAlliance?.score || 0;
      let scoreBlue = blueAlliance?.score || 0;
      
      // If alliance scores are 0, try flexible scoring system
      if (scoreRed === 0 && match.matchScores) {
        const redAllianceScores = match.matchScores.filter(score => 
          match.alliances.find(a => a.id === score.allianceId)?.color === AllianceColor.RED
        );
        scoreRed = redAllianceScores.reduce((sum, score) => sum + (score.totalPoints || 0), 0);
      }
      
      if (scoreBlue === 0 && match.matchScores) {
        const blueAllianceScores = match.matchScores.filter(score => 
          match.alliances.find(a => a.id === score.allianceId)?.color === AllianceColor.BLUE
        );
        scoreBlue = blueAllianceScores.reduce((sum, score) => sum + (score.totalPoints || 0), 0);
      }
      
      console.log(`🔍 SwissScheduler match ${match.id} scores: RED=${scoreRed}, BLUE=${scoreBlue} (from alliance.score or matchScores)`);
      for (const teamId of redTeams) {
        const result = teamResults.get(teamId);
        if (!result) continue;
        result.pointsScored += scoreRed;
        result.pointsConceded += scoreBlue;
        blueTeams.forEach(op => result.opponents.add(op));
        if (scoreRed > scoreBlue) result.wins++;
        else if (scoreRed < scoreBlue) result.losses++;
        else result.ties++;
      }
      for (const teamId of blueTeams) {
        const result = teamResults.get(teamId);
        if (!result) continue;
        result.pointsScored += scoreBlue;
        result.pointsConceded += scoreRed;
        redTeams.forEach(op => result.opponents.add(op));
        if (scoreBlue > scoreRed) result.wins++;
        else if (scoreBlue < scoreRed) result.losses++;
        else result.ties++;
      }
    }
    const winPercents = new Map<string, number>();
    for (const [teamId, result] of teamResults.entries()) {
      const total = result.wins + result.losses + result.ties;
      winPercents.set(teamId, total > 0 ? result.wins / total : 0);
    }
    // Get tournament ID from stage once
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      select: { tournamentId: true }
    });
    
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }
    
    // Update team stats with calculated values
    const statsUpdates: Promise<any>[] = [];
    for (const [teamId, result] of teamResults.entries()) {
      let owp = 0;
      if (result.opponents.size > 0) {
        owp = Array.from(result.opponents)
          .map(opId => winPercents.get(opId) ?? 0)
          .reduce((a, b) => a + b, 0) / result.opponents.size;
      }
      const pointDiff = result.pointsScored - result.pointsConceded;
      const rankingPoints = result.wins * 2 + result.ties;
      
      console.log(`🔍 SwissScheduler updating stats for team ${teamId}:`, {
        wins: result.wins, losses: result.losses, ties: result.ties,
        rankingPoints, opponentWinPercentage: owp, pointDifferential: pointDiff
      });
      
      // Use upsert to ensure we update the correct record, prioritizing the unique constraint
      statsUpdates.push(
        this.prisma.teamStats.upsert({
          where: { teamId_tournamentId: { teamId, tournamentId: stage.tournamentId } },
          create: {
            teamId,
            tournamentId: stage.tournamentId,
            stageId,
            wins: result.wins,
            losses: result.losses,
            ties: result.ties,
            pointsScored: result.pointsScored,
            pointsConceded: result.pointsConceded,
            matchesPlayed: result.wins + result.losses + result.ties,
            rankingPoints,
            opponentWinPercentage: owp,
            pointDifferential: pointDiff
          },
          update: {
            stageId, // Update stageId to current stage
            wins: result.wins,
            losses: result.losses,
            ties: result.ties,
            pointsScored: result.pointsScored,
            pointsConceded: result.pointsConceded,
            matchesPlayed: result.wins + result.losses + result.ties,
            rankingPoints,
            opponentWinPercentage: owp,
            pointDifferential: pointDiff
          }
        })
      );
    }
    await Promise.all(statsUpdates);
  }

  async getSwissRankings(stageId: string) {
    return this.prisma.teamStats.findMany({
      where: { stageId },
      orderBy: [
        { rankingPoints: 'desc' },
        { opponentWinPercentage: 'desc' },
        { pointDifferential: 'desc' },
        { matchesPlayed: 'desc' }
      ],
      include: { team: true }
    });
  }

  /**
   * Generates a new Swiss round by pairing teams based on their current standings
   * @param stageId The stage ID
   * @param currentRoundNumber The current round number (0-based)
   * @returns Array of created matches
   */
  async generateSwissRound(stageId: string, currentRoundNumber: number): Promise<PrismaMatch[]> {
    // Validate stage exists
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      include: {
        tournament: {
          include: {
            teams: true,
            fields: true,
          },
        },
        teams: true,
      },
    });

    if (!stage) {
      throw new Error(`Stage with ID ${stageId} not found`);
    }

    // Get current rankings
    const rankings = await this.getSwissRankings(stageId);
    
    // If no rankings exist yet, create initial team stats
    if (rankings.length === 0) {
      await this.updateSwissRankings(stageId);
      // Get rankings again after creating team stats
      const newRankings = await this.getSwissRankings(stageId);
      return this.createMatches(stageId, newRankings, currentRoundNumber + 1);
    }

    return this.createMatches(stageId, rankings, currentRoundNumber + 1);
  }
  /**
   * Creates matches for Swiss tournament based on current rankings
   * @param stageId The stage ID
   * @param rankings Current team rankings
   * @param roundNumber Round number for the new matches
   * @returns Array of created matches
   */
  private async createMatches(stageId: string, rankings: any[], roundNumber: number): Promise<PrismaMatch[]> {
    // Group teams by similar performance (Swiss pairing)
    const matches: PrismaMatch[] = [];
    const usedTeams = new Set<string>();
    
    // Get the highest match number already used in this stage
    const existingMatches = await this.prisma.match.findMany({
      where: { stageId },
      select: { matchNumber: true },
      orderBy: { matchNumber: 'desc' },
      take: 1
    });
    
    let nextMatchNumber = existingMatches.length > 0 ? existingMatches[0].matchNumber + 1 : 1;
      // Sort teams by ranking points, then by tiebreakers
    const sortedTeams = [...rankings].sort((a, b) => {
      if (b.rankingPoints !== a.rankingPoints) return b.rankingPoints - a.rankingPoints;
      if (b.opponentWinPercentage !== a.opponentWinPercentage) return b.opponentWinPercentage - a.opponentWinPercentage;
      return b.pointDifferential - a.pointDifferential;
    });

    console.log(`\nGenerating Swiss matches with closest performance pairing for ${sortedTeams.length} teams`);

    // Pair teams with closest performance (Swiss pairing)
    for (let i = 0; i < sortedTeams.length; i += 4) {
      // Get available teams that haven't been paired yet
      const availableTeams = sortedTeams.filter(team => !usedTeams.has(team.teamId));
      
      if (availableTeams.length < 4) {
        console.log(`Only ${availableTeams.length} unpaired teams remaining, stopping match generation`);
        break;
      }
      
      // Take the first 4 available teams (closest performance)
      const matchTeams = availableTeams.slice(0, 4);
      const redTeam1 = matchTeams[0];
      const redTeam2 = matchTeams[1];
      const blueTeam1 = matchTeams[2];
      const blueTeam2 = matchTeams[3];const match = await this.prisma.match.create({
        data: {
          stageId,
          roundNumber,
          matchNumber: nextMatchNumber,
          status: 'PENDING',
          alliances: {
            create: [
              {
                color: AllianceColor.RED,
                teamAlliances: {
                  create: [
                    { teamId: redTeam1.teamId, stationPosition: 1 },
                    { teamId: redTeam2.teamId, stationPosition: 2 },
                  ],
                },
              },
              {
                color: AllianceColor.BLUE,
                teamAlliances: {
                  create: [
                    { teamId: blueTeam1.teamId, stationPosition: 1 },
                    { teamId: blueTeam2.teamId, stationPosition: 2 },
                  ],
                },
              },
            ],
          },
        },
        include: {
          alliances: {
            include: {
              teamAlliances: {
                include: {
                  team: true,
                },
              },
            },
          },
        },
      });      matches.push(match);
      usedTeams.add(redTeam1.teamId);
      usedTeams.add(redTeam2.teamId);
      usedTeams.add(blueTeam1.teamId);
      usedTeams.add(blueTeam2.teamId);
        // Increment match number for next match
      nextMatchNumber++;
    }

    console.log(`\nGenerated ${matches.length} Swiss matches for round ${roundNumber}`);
    return matches;
  }
}
