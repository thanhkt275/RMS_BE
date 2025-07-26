import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class TeamRankingDto {
  @IsString()
  teamId: string;

  @IsString()
  teamNumber: string;

  @IsString()
  teamName: string;

  @IsNumber()
  wins: number;

  @IsNumber()
  losses: number;

  @IsNumber()
  ties: number;

  @IsNumber()
  pointsScored: number;

  @IsNumber()
  pointsConceded: number;

  @IsNumber()
  pointDifferential: number;

  @IsNumber()
  rankingPoints: number;

  @IsNumber()
  tiebreaker1: number;

  @IsNumber()
  tiebreaker2: number;

  @IsNumber()
  rank: number;
}

export class RankingUpdateEventDto {
  @IsString()
  type: 'ranking_update';

  @IsString()
  tournamentId: string;

  @IsString()
  @IsOptional()
  stageId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamRankingDto)
  rankings: TeamRankingDto[];

  @IsNumber()
  timestamp: number;

  @IsString()
  @IsOptional()
  triggerMatchId?: string;

  @IsEnum(['full', 'incremental'])
  updateType: 'full' | 'incremental';
}

export class RankingRecalculationEventDto {
  @IsEnum(['ranking_recalculation_started', 'ranking_recalculation_completed', 'ranking_recalculation_failed'])
  type: 'ranking_recalculation_started' | 'ranking_recalculation_completed' | 'ranking_recalculation_failed';

  @IsString()
  tournamentId: string;

  @IsString()
  @IsOptional()
  stageId?: string;

  @IsNumber()
  timestamp: number;

  @IsNumber()
  @IsOptional()
  progress?: number;

  @IsString()
  @IsOptional()
  error?: string;
}

export class RankingSubscriptionDto {
  @IsString()
  tournamentId: string;

  @IsString()
  @IsOptional()
  stageId?: string;
}

export class RankingUnsubscriptionDto {
  @IsString()
  tournamentId: string;
}
