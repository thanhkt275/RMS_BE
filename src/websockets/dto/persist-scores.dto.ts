import { IsString, IsBoolean } from 'class-validator';
import { BaseScoreDto } from './base-score.dto';

/**
 * DTO for requesting database persistence of scores via WebSocket
 * This extends BaseScoreDto with additional fields for database operations
 */
export class PersistScoresDto extends BaseScoreDto {
  @IsString()
  type: 'persist';

  @IsBoolean()
  finalScores: boolean;

  @IsString()
  submittedBy: string;
}
