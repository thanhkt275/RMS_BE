import { Match, Schedule } from './match-scheduler.types';

/**
 * Utility functions for schedule/statistics calculations shared across schedulers.
 */
export class ScheduleUtils {
  static updateTeamStats(
    schedule: Schedule,
    match: Match,
    stationsPerAlliance: number,
    matchIndex?: number
  ): void {
    const matchNum = matchIndex !== undefined ? matchIndex : match.matchNumber - 1;
    // Process red alliance
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
    // Process blue alliance
    for (let i = 0; i < match.blueAlliance.length; i++) {
      const team = match.blueAlliance[i];
      const teamStats = schedule.teamStats.get(team);
      if (teamStats) {
        teamStats.appearances.push(matchNum);
        teamStats.blueCount++;
        teamStats.stationAppearances[i + stationsPerAlliance]++;
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

  static recalculateTeamStats(
    schedule: Schedule,
    stationsPerAlliance: number
  ): void {
    for (const team of schedule.teamStats.keys()) {
      schedule.teamStats.set(team, {
        appearances: [],
        partners: new Map(),
        opponents: new Map(),
        redCount: 0,
        blueCount: 0,
        stationAppearances: Array(stationsPerAlliance * 2).fill(0)
      });
    }
    for (let matchIndex = 0; matchIndex < schedule.matches.length; matchIndex++) {
      this.updateTeamStats(schedule, schedule.matches[matchIndex], stationsPerAlliance, matchIndex);
    }
  }

  static cloneSchedule(schedule: Schedule): Schedule {
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
}
