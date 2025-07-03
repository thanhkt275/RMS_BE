import { IsString } from 'class-validator';
import { BaseScoreDto } from './base-score.dto';

/**
 * DTO for real-time score updates via WebSocket
 * This represents score changes that are broadcast immediately without database persistence
 */
export class ScoreUpdateDto extends BaseScoreDto {
  @IsString()
  type: 'realtime';
}
