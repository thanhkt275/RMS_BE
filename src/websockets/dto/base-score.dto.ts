import { IsString, IsNumber, IsOptional, IsObject, IsInt } from 'class-validator';

/**
 * Base DTO for score-related WebSocket operations
 * Contains common fields shared between real-time updates and persistence requests
 */
export class BaseScoreDto {
  @IsString()
  matchId: string;

  @IsString()
  @IsOptional()
  fieldId?: string;

  @IsString()
  @IsOptional()
  tournamentId?: string;

  @IsNumber()
  @IsOptional()
  redAutoScore?: number;

  @IsNumber()
  @IsOptional()
  redDriveScore?: number;

  @IsNumber()
  @IsOptional()
  redTotalScore?: number;

  @IsNumber()
  @IsOptional()
  blueAutoScore?: number;

  @IsNumber()
  @IsOptional()
  blueDriveScore?: number;

  @IsNumber()
  @IsOptional()
  blueTotalScore?: number;

  @IsInt()
  @IsOptional()
  redTeamCount?: number;

  @IsInt()
  @IsOptional()
  blueTeamCount?: number;

  @IsNumber()
  @IsOptional()
  redMultiplier?: number;

  @IsNumber()
  @IsOptional()
  blueMultiplier?: number;

  @IsObject()
  @IsOptional()
  redGameElements?: Record<string, number>;

  @IsObject()
  @IsOptional()
  blueGameElements?: Record<string, number>;

  @IsObject()
  @IsOptional()
  scoreDetails?: Record<string, any>;

  @IsNumber()
  timestamp: number;
}
