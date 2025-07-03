import { ApiProperty } from '@nestjs/swagger';

export class TeamStatsResponseDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  teamId: string;
  @ApiProperty()
  teamNumber: string;
  @ApiProperty()
  teamName: string;
  @ApiProperty({ required: false })
  organization?: string;
  @ApiProperty()
  tournamentId: string;
  @ApiProperty()
  tournamentName: string;
  @ApiProperty({ required: false })
  stageId?: string;
  @ApiProperty({ required: false })
  stageName?: string;
  @ApiProperty()
  wins: number;
  @ApiProperty()
  losses: number;
  @ApiProperty()
  ties: number;
  @ApiProperty()
  pointsScored: number;
  @ApiProperty()
  pointsConceded: number;
  @ApiProperty()
  matchesPlayed: number;
  @ApiProperty()
  rankingPoints: number;
  @ApiProperty()
  opponentWinPercentage: number;
  @ApiProperty()
  pointDifferential: number;
  @ApiProperty({ required: false })
  rank?: number;
  @ApiProperty()
  tiebreaker1: number;
  @ApiProperty()
  tiebreaker2: number;
  @ApiProperty()
  winPercentage: number;
  @ApiProperty()
  avgPointsScored: number;
  @ApiProperty()
  avgPointsConceded: number;
}
