import { IsString, IsNumber, IsOptional, IsBoolean, IsObject } from 'class-validator';

/**
 * DTO for persistence result events sent via WebSocket
 * This represents the outcome of a database persistence operation
 */
export class PersistenceResultDto {
  @IsString()
  matchId: string;

  @IsBoolean()
  success: boolean;

  @IsObject()
  @IsOptional()
  data?: any;

  @IsString()
  @IsOptional()
  error?: string;

  @IsNumber()
  timestamp: number;
}
