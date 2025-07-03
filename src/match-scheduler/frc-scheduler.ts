import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Match as PrismaMatch, MatchState, AllianceColor } from '../utils/prisma-types';
import { Match, Schedule } from './match-scheduler.types';

/**
 * FRC-style schedule generation and optimization logic.
 * Extracted from MatchSchedulerService for separation of concerns.
 */
@Injectable()
export class FrcScheduler {
  private readonly RED_ALLIANCE_SIZE = 2;
  private readonly BLUE_ALLIANCE_SIZE = 2;
  private readonly TEAMS_PER_MATCH = 4;
  private readonly STATIONS_PER_ALLIANCE = 2;
  private readonly PARTNER_REPEAT_WEIGHT = 3.0;
  private readonly OPPONENT_REPEAT_WEIGHT = 2.0;
  private readonly GENERAL_REPEAT_WEIGHT = 1.0;
  private readonly INITIAL_TEMPERATURE = 100.0;
  private readonly COOLING_RATE = 0.95;
  private readonly MIN_TEMPERATURE = 0.01;
  private readonly ITERATIONS_PER_TEMPERATURE = 100;

  constructor(private readonly prisma: PrismaService) {}

  async generateFrcSchedule(
    stage: any,
    rounds: number,
    minMatchSeparation: number = 1,
    maxIterations?: number,
    qualityLevel: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<PrismaMatch[]> {
    const teams = stage.tournament.teams;
    const numTeams = teams.length;
    const fields = stage.tournament.fields;
    if (!fields || fields.length === 0) {
      throw new Error('No fields found for this tournament.');
    }
    const shuffledFields = [...fields].sort(() => Math.random() - 0.5);
    const fieldAssignmentCounts = new Array(shuffledFields.length).fill(0);
    if (numTeams < this.TEAMS_PER_MATCH) {
      throw new Error(`Not enough teams (${numTeams}) to create a schedule. Minimum required: ${this.TEAMS_PER_MATCH}`);
    }
    const teamIdMap = new Map<number, string>();
    teams.forEach((team, idx) => {
      const numId = idx + 1;
      teamIdMap.set(numId, team.id);
    });
    const iterationsMap = { low: 5000, medium: 10000, high: 25000 };
    const iterations = maxIterations || iterationsMap[qualityLevel];
    let schedule = this.generateInitialSchedule(numTeams, rounds);
    schedule = this.optimizeSchedule(schedule, iterations, minMatchSeparation);
    const createdMatches: PrismaMatch[] = [];
    let matchNumber = 1;
    for (const match of schedule.matches) {
      const redTeamIds = match.redAlliance.map(id => teamIdMap.get(id));
      const blueTeamIds = match.blueAlliance.map(id => teamIdMap.get(id));
      let minCount = Math.min(...fieldAssignmentCounts);
      let candidateIndexes = fieldAssignmentCounts
        .map((count, idx) => (count === minCount ? idx : -1))
        .filter(idx => idx !== -1);      let chosenIdx = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
      let chosenField = shuffledFields[chosenIdx];
      fieldAssignmentCounts[chosenIdx]++;
      const dbMatch = await this.prisma.match.create({
        data: {
          stageId: stage.id,
          matchNumber: matchNumber++,          roundNumber: 1,
          scheduledTime: new Date(Date.now() + ((matchNumber - 1) * 6 * 60 * 1000)),
          status: MatchState.PENDING,
          fieldId: chosenField.id,
          // fieldNumber removed - can access via match.field.number relationship
          alliances: {
            create: [
              {
                color: AllianceColor.RED,
                teamAlliances: {
                  create: redTeamIds.map((teamId, idx) => ({
                    stationPosition: idx + 1,
                    isSurrogate: match.surrogates?.includes(match.redAlliance[idx]) || false,
                    team: { connect: { id: teamId } },
                  })),
                },
              },              {
                color: AllianceColor.BLUE,
                teamAlliances: {
                  create: blueTeamIds.map((teamId, idx) => ({
                    stationPosition: idx + 1,
                    isSurrogate: match.surrogates?.includes(match.blueAlliance[idx]) || false,
                    team: { connect: { id: teamId } },
                  })),
                },
              },
            ],
          },
        },
        include: {
          stage: { select: { name: true } },
          alliances: {
            include: {
              teamAlliances: { include: { team: true } },
            },
          },
        },
      });
      createdMatches.push(dbMatch as any);
    }
    return createdMatches;
  }

  private optimizeSchedule(schedule: Schedule, maxIterations: number, minMatchSeparation: number): Schedule {
    schedule.score = this.calculateScheduleScore(schedule, minMatchSeparation);
    let bestSchedule = this.cloneSchedule(schedule);
    let bestScore = schedule.score;
    let temperature = this.INITIAL_TEMPERATURE;
    for (let iteration = 0; iteration < maxIterations && temperature > this.MIN_TEMPERATURE; iteration++) {
      if (iteration % 1000 === 0) {
        // Optionally log progress
      }
      const neighbor = this.generateNeighborSchedule(schedule);
      const neighborScore = this.calculateScheduleScore(neighbor, minMatchSeparation);
      neighbor.score = neighborScore;
      const acceptanceProbability = this.calculateAcceptanceProbability(schedule.score, neighborScore, temperature);
      if (acceptanceProbability > Math.random()) {
        schedule = neighbor;
        if (schedule.score < bestScore) {
          bestSchedule = this.cloneSchedule(schedule);
          bestScore = schedule.score;
        }
      }
      if (iteration % this.ITERATIONS_PER_TEMPERATURE === 0) {
        temperature *= this.COOLING_RATE;
      }
    }
    return bestSchedule;
  }

  private calculateAcceptanceProbability(currentScore: number, newScore: number, temperature: number): number {
    if (newScore < currentScore) return 1.0;
    if (temperature < 0.0001) return 0.0;
    const scoreDelta = newScore - currentScore;
    return Math.exp(-scoreDelta / temperature);
  }

  private generateNeighborSchedule(schedule: Schedule): Schedule {
    const newSchedule = this.cloneSchedule(schedule);
    const matches = newSchedule.matches;
    if (matches.length >= 2) {
      const match1Index = Math.floor(Math.random() * matches.length);
      let match2Index = Math.floor(Math.random() * (matches.length - 1));
      if (match2Index >= match1Index) match2Index++;
      const match1 = matches[match1Index];
      const match2 = matches[match2Index];
      const alliance1 = Math.random() < 0.5 ? 'redAlliance' : 'blueAlliance';
      const alliance2 = Math.random() < 0.5 ? 'redAlliance' : 'blueAlliance';
      const pos1 = Math.floor(Math.random() * this.RED_ALLIANCE_SIZE);
      const pos2 = Math.floor(Math.random() * this.RED_ALLIANCE_SIZE);
      const tmp = match1[alliance1][pos1];
      match1[alliance1][pos1] = match2[alliance2][pos2];
      match2[alliance2][pos2] = tmp;
      this.recalculateTeamStats(newSchedule);
    }
    return newSchedule;
  }

  private recalculateTeamStats(schedule: Schedule): void {
    for (const team of schedule.teamStats.keys()) {
      schedule.teamStats.set(team, {
        appearances: [],
        partners: new Map(),
        opponents: new Map(),
        redCount: 0,
        blueCount: 0,
        stationAppearances: Array(this.STATIONS_PER_ALLIANCE * 2).fill(0)
      });
    }
    for (let matchIndex = 0; matchIndex < schedule.matches.length; matchIndex++) {
      this.updateTeamStats(schedule, schedule.matches[matchIndex], matchIndex);
    }
  }

  private cloneSchedule(schedule: Schedule): Schedule {
    const clonedMatches = schedule.matches.map(match => ({
      matchNumber: match.matchNumber,
      redAlliance: [...match.redAlliance],
      blueAlliance: [...match.blueAlliance],
      surrogates: match.surrogates ? [...match.surrogates] : undefined
    }));
    const clonedTeamStats = new Map();
    for (const [team, stats] of schedule.teamStats.entries()) {
      const clonedPartners = new Map();
      for (const [partner, count] of stats.partners.entries()) {
        clonedPartners.set(partner, count);
      }
      const clonedOpponents = new Map();
      for (const [opponent, count] of stats.opponents.entries()) {
        clonedOpponents.set(opponent, count);
      }
      clonedTeamStats.set(team, {
        appearances: [...stats.appearances],
        partners: clonedPartners,
        opponents: clonedOpponents,
        redCount: stats.redCount,
        blueCount: stats.blueCount,
        stationAppearances: [...stats.stationAppearances]
      });
    }
    return {
      matches: clonedMatches,
      score: schedule.score,
      teamStats: clonedTeamStats
    };
  }

  private calculateScheduleScore(schedule: Schedule, minMatchSeparation: number): number {
    let score = 0;
    for (const [, stats] of schedule.teamStats.entries()) {
      for (const [, partnerCount] of stats.partners.entries()) {
        if (partnerCount > 1) {
          score += this.PARTNER_REPEAT_WEIGHT * (partnerCount - 1);
        }
      }
      for (const [, opponentCount] of stats.opponents.entries()) {
        if (opponentCount > 1) {
          score += this.OPPONENT_REPEAT_WEIGHT * (opponentCount - 1);
        }
      }
      for (let i = 0; i < stats.appearances.length - 1; i++) {
        const currentMatch = stats.appearances[i];
        const nextMatch = stats.appearances[i + 1];
        const separation = nextMatch - currentMatch;
        if (separation < minMatchSeparation) {
          score += (minMatchSeparation - separation) * 10;
        }
      }
      const redBlueImbalance = Math.abs(stats.redCount - stats.blueCount);
      score += redBlueImbalance * 2;
      const expectedAppearancesPerStation = stats.appearances.length / (this.STATIONS_PER_ALLIANCE * 2);
      for (const stationCount of stats.stationAppearances) {
        score += Math.abs(stationCount - expectedAppearancesPerStation) * 0.5;
      }
    }
    return score;
  }

  private updateTeamStats(schedule: Schedule, match: Match, matchIndex?: number): void {
    const matchNum = matchIndex !== undefined ? matchIndex : match.matchNumber - 1;
    for (let i = 0; i < match.redAlliance.length; i++) {
      const team = match.redAlliance[i];
      const teamStats = schedule.teamStats.get(team);
      if (teamStats) {
        teamStats.appearances.push(matchNum);
        teamStats.redCount++;
        teamStats.stationAppearances[i]++;
        for (let j = 0; j < match.redAlliance.length; j++) {
          if (i === j) continue;
          const partner = match.redAlliance[j];
          const currentCount = teamStats.partners.get(partner) || 0;
          teamStats.partners.set(partner, currentCount + 1);
        }
        for (const opponent of match.blueAlliance) {
          const currentCount = teamStats.opponents.get(opponent) || 0;
          teamStats.opponents.set(opponent, currentCount + 1);
        }
      }
    }
    for (let i = 0; i < match.blueAlliance.length; i++) {
      const team = match.blueAlliance[i];
      const teamStats = schedule.teamStats.get(team);
      if (teamStats) {
        teamStats.appearances.push(matchNum);
        teamStats.blueCount++;
        teamStats.stationAppearances[i + this.STATIONS_PER_ALLIANCE]++;
        for (let j = 0; j < match.blueAlliance.length; j++) {
          if (i === j) continue;
          const partner = match.blueAlliance[j];
          const currentCount = teamStats.partners.get(partner) || 0;
          teamStats.partners.set(partner, currentCount + 1);
        }
        for (const opponent of match.redAlliance) {
          const currentCount = teamStats.opponents.get(opponent) || 0;
          teamStats.opponents.set(opponent, currentCount + 1);
        }
      }
    }
  }

  private generateInitialSchedule(numTeams: number, rounds: number): Schedule {
    const matches: Match[] = [];
    const totalMatches = Math.ceil((numTeams * rounds) / this.TEAMS_PER_MATCH);
    const teamStats = new Map();
    for (let i = 1; i <= numTeams; i++) {
      teamStats.set(i, {
        appearances: [],
        partners: new Map(),
        opponents: new Map(),
        redCount: 0,
        blueCount: 0,
        stationAppearances: Array(this.STATIONS_PER_ALLIANCE * 2).fill(0)
      });
    }
    let matchNumber = 1;
    let matchesNeeded = totalMatches;
    if (numTeams % this.TEAMS_PER_MATCH === 0) {
      while (matchesNeeded > 0) {
        const match: Match = {
          matchNumber: matchNumber++,
          redAlliance: [],
          blueAlliance: []
        };
        for (let i = 0; i < this.RED_ALLIANCE_SIZE; i++) {
          const teamIndex = ((matchNumber - 1) * this.TEAMS_PER_MATCH + i) % numTeams;
          match.redAlliance.push(teamIndex + 1);
        }
        for (let i = 0; i < this.BLUE_ALLIANCE_SIZE; i++) {
          const teamIndex = ((matchNumber - 1) * this.TEAMS_PER_MATCH + i + this.RED_ALLIANCE_SIZE) % numTeams;
          match.blueAlliance.push(teamIndex + 1);
        }
        matches.push(match);
        this.updateTeamStats({ matches, score: 0, teamStats }, match, matches.length - 1);
        matchesNeeded--;
      }
    } else {
      const teamAppearances = Array(numTeams + 1).fill(0);
      while (matchesNeeded > 0) {
        const match: Match = {
          matchNumber: matchNumber++,
          redAlliance: [],
          blueAlliance: [],
          surrogates: []
        };
        const sortedTeams = Array.from({ length: numTeams }, (_, i) => i + 1)
          .sort((a, b) => teamAppearances[a] - teamAppearances[b]);
        for (let i = 0; i < this.RED_ALLIANCE_SIZE; i++) {
          if (match.redAlliance.length < this.RED_ALLIANCE_SIZE) {
            const team = sortedTeams[i];
            match.redAlliance.push(team);
            teamAppearances[team]++;
          }
        }
        for (let i = 0; i < this.BLUE_ALLIANCE_SIZE; i++) {
          if (match.blueAlliance.length < this.BLUE_ALLIANCE_SIZE) {
            const team = sortedTeams[i + this.RED_ALLIANCE_SIZE];
            match.blueAlliance.push(team);
            teamAppearances[team]++;
          }
        }
        matches.push(match);
        this.updateTeamStats({ matches, score: 0, teamStats }, match, matches.length - 1);
        matchesNeeded--;
      }
    }
    return { matches, score: 0, teamStats };
  }
}
