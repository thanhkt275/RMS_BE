import { ApiProperty } from '@nestjs/swagger';
import { TeamStatsResponseDto } from './team-stats-response.dto';

export class LeaderboardEntryDto extends TeamStatsResponseDto {
  @ApiProperty()
  position: number;
}

export class LeaderboardResponseDto {
  @ApiProperty()
  tournamentId: string;
  @ApiProperty()
  tournamentName: string;
  @ApiProperty({ required: false })
  stageId?: string;
  @ApiProperty({ required: false })
  stageName?: string;
  @ApiProperty()
  totalTeams: number;
  @ApiProperty({ type: [LeaderboardEntryDto] })
  rankings: LeaderboardEntryDto[];
}
