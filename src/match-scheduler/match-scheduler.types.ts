// Types and interfaces for match scheduling logic

export interface Match {
  matchNumber: number;
  redAlliance: number[];
  blueAlliance: number[];
  surrogates?: number[];
}

export interface TeamStats {
  appearances: number[];
  partners: Map<number, number>;
  opponents: Map<number, number>;
  redCount: number;
  blueCount: number;
  stationAppearances: number[];
}

export interface Schedule {
  matches: Match[];
  score: number;
  teamStats: Map<number, TeamStats>;
}

export interface BracketAdvancement {
  matchId: string;
  nextMatchId: string;
  advancesAs: 'RED' | 'BLUE';
}
