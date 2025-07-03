import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamStatsFilterDto {
  @ApiPropertyOptional()
  teamName?: string;
  @ApiPropertyOptional()
  teamNumber?: string;
  @ApiPropertyOptional()
  minWins?: number;
  @ApiPropertyOptional()
  maxWins?: number;
  @ApiPropertyOptional()
  minRank?: number;
  @ApiPropertyOptional()
  maxRank?: number;
  @ApiPropertyOptional()
  minScore?: number;
  @ApiPropertyOptional()
  maxScore?: number;
  @ApiPropertyOptional({ default: 'rank' })
  sortBy?: string = 'rank';
  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  sortDir?: 'asc' | 'desc' = 'asc';
  @ApiPropertyOptional({ default: 100 })
  limit?: number = 100;
  @ApiPropertyOptional({ default: 0 })
  offset?: number = 0;
}
