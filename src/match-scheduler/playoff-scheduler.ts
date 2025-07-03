import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Match as PrismaMatch, StageType, AllianceColor, MatchState } from '../utils/prisma-types';
import { BracketAdvancement } from './match-scheduler.types';

/**
 * Playoff bracket generation and advancement logic.
 * Extracted from MatchSchedulerService for separation of concerns.
 */
@Injectable()
export class PlayoffScheduler {
  private bracketAdvancements: BracketAdvancement[] = [];

  constructor(private readonly prisma: PrismaService) { }

  async generatePlayoffSchedule(stage: any, numberOfRounds: number): Promise<PrismaMatch[]> {
    if (stage.type !== StageType.PLAYOFF) {
      throw new Error(`Stage with ID ${stage.id} is not a PLAYOFF stage`);
    }
    const numTeamsNeeded = Math.pow(2, numberOfRounds);
    const teamStats = await this.prisma.teamStats.findMany({
      where: { tournamentId: stage.tournament.id },
      include: { team: true },
      orderBy: [
        { wins: 'desc' },
        { tiebreaker1: 'desc' },
        { tiebreaker2: 'desc' }
      ]
    });
    if (teamStats.length < numTeamsNeeded) {
      throw new Error(`Not enough teams with stats for a ${numberOfRounds}-round playoff. Need ${numTeamsNeeded} teams, got ${teamStats.length}`);
    }
    const matches: PrismaMatch[] = [];
    this.bracketAdvancements = [];
    for (let round = 1; round <= numberOfRounds; round++) {
      const matchesInRound = Math.pow(2, numberOfRounds - round);
      if (round === 1) {
        for (let i = 0; i < matchesInRound; i++) {
          const highSeedIdx = i;
          const lowSeedIdx = numTeamsNeeded - 1 - i;
          const highSeed = teamStats[highSeedIdx];
          const lowSeed = teamStats[lowSeedIdx];
          const dbMatch = await this.prisma.match.create({
            data: {
              stageId: stage.id,
              matchNumber: i + 1,
              roundNumber: round,
              scheduledTime: new Date(Date.now() + ((i + 1) * 15 * 60 * 1000)), status: MatchState.PENDING,
              alliances: {
                create: [
                  {
                    color: AllianceColor.RED,


                    teamAlliances: {
                      create: [{ teamId: highSeed.teamId, stationPosition: 1 }]
                    }
                  },
                  {
                    color: AllianceColor.BLUE,
                    teamAlliances: {
                      create: [{ teamId: lowSeed.teamId, stationPosition: 1 }]
                    }
                  }
                ]
              }
            },
            include: {
              alliances: {
                include: {
                  teamAlliances: { include: { team: true } }
                }
              }
            }
          });
          matches.push(dbMatch as any);
          if (round < numberOfRounds) {
            const nextMatchNumber = Math.floor(i / 2) + 1;
            if (i % 2 === 0) {
              const nextRoundMatch = await this.prisma.match.create({
                data: {
                  stageId: stage.id,
                  matchNumber: nextMatchNumber + matchesInRound,
                  roundNumber: round + 1,
                  scheduledTime: new Date(Date.now() + ((nextMatchNumber + matchesInRound) * 15 * 60 * 1000)), status: MatchState.PENDING,
                  alliances: {
                    create: [
                      { color: AllianceColor.RED, teamAlliances: { create: [] } },
                      { color: AllianceColor.BLUE, teamAlliances: { create: [] } }
                    ]
                  }
                },
                include: {
                  alliances: { include: { teamAlliances: true } }
                }
              });
              matches.push(nextRoundMatch as any);
            }
            this.bracketAdvancements.push({
              matchId: dbMatch.id,
              nextMatchId: matches[matches.length - (i % 2 === 0 ? 1 : 2)].id,
              advancesAs: i % 2 === 0 ? AllianceColor.RED : AllianceColor.BLUE
            });
          }
        }
      }
    }
    return matches;
  }

  async updatePlayoffBrackets(matchId: string): Promise<PrismaMatch[]> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        alliances: { include: { teamAlliances: true } },
        matchScores: true
      }
    });
    if (!match) throw new Error(`Match with ID ${matchId} not found`);
    if (match.status !== MatchState.COMPLETED) throw new Error(`Match ${matchId} is not completed`);
    if (!match.winningAlliance) throw new Error(`Match ${matchId} has no winning alliance`);
    const advancement = this.bracketAdvancements.find(adv => adv.matchId === matchId);
    if (!advancement) throw new Error(`No advancement information for match ${matchId}`);
    const winningAlliance = match.alliances.find(alliance => alliance.color === match.winningAlliance);
    if (!winningAlliance) throw new Error(`No winning alliance found for match ${matchId}`);
    const nextMatch = await this.prisma.match.findUnique({
      where: { id: advancement.nextMatchId },
      include: { alliances: true }
    });
    if (!nextMatch) throw new Error(`Next match ${advancement.nextMatchId} not found`);
    const targetAlliance = nextMatch.alliances.find(alliance => alliance.color === advancement.advancesAs);
    if (!targetAlliance) throw new Error(`Target alliance ${advancement.advancesAs} not found in next match`);
    for (const teamAlliance of winningAlliance.teamAlliances) {
      await this.prisma.teamAlliance.create({
        data: {
          allianceId: targetAlliance.id,
          teamId: teamAlliance.teamId,
          stationPosition: teamAlliance.stationPosition
        }
      });
    }
    const updatedMatches = await this.prisma.match.findMany({
      where: { id: { in: [matchId, advancement.nextMatchId] } },
      include: {
        alliances: {
          include: {
            teamAlliances: { include: { team: true } }
          }
        }
      }
    });
    return updatedMatches as any[];
  }

  async finalizePlayoffRankings(stageId: string): Promise<PrismaMatch[]> {
    const matches = await this.prisma.match.findMany({
      where: { stageId },
      include: {
        alliances: {
          include: {
            teamAlliances: { include: { team: true } }
          }
        }
      },
      orderBy: [
        { roundNumber: 'desc' },
        { matchNumber: 'asc' }
      ]
    });
    if (matches.length === 0) throw new Error(`No matches found for stage ${stageId}`);
    const incompleteMatches = matches.filter(match => match.status !== MatchState.COMPLETED);
    if (incompleteMatches.length > 0) throw new Error(`Cannot finalize rankings: ${incompleteMatches.length} matches are still incomplete`);
    const teamRankings = new Map<string, number>();
    for (const match of matches) {
      if (!match.winningAlliance) continue;
      const winningAlliance = match.alliances.find(a => a.color === match.winningAlliance);
      const losingAlliance = match.alliances.find(a => a.color !== match.winningAlliance);
      if (!winningAlliance || !losingAlliance) continue;
      const maxRound = Math.max(...matches.map(m => m.roundNumber || 0));
      if (match.roundNumber === maxRound) {
        for (const ta of winningAlliance.teamAlliances) {
          teamRankings.set(ta.teamId, 1);
        }
        for (const ta of losingAlliance.teamAlliances) {
          teamRankings.set(ta.teamId, 2);
        }
      } else {
        const roundNumber = match.roundNumber || 0;
        const baseRank = Math.pow(2, maxRound - roundNumber) + 1;
        for (const ta of losingAlliance.teamAlliances) {
          teamRankings.set(ta.teamId, baseRank);
        }
      }
    }
    for (const [teamId, rank] of teamRankings.entries()) {
      await this.prisma.teamStats.updateMany({
        where: { teamId, stageId },
        data: { rank }
      });
    }
    return matches as any[];
  }
}
