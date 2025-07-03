import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitScoreDto {
  @ApiProperty({ description: 'Score values for each element by code' })
  @IsObject()
  elementScores: Record<string, number>;

  @ApiProperty({ description: 'Optional specific score config ID to use', required: false })
  @IsString()
  @IsOptional()
  scoreConfigId?: string;
}
