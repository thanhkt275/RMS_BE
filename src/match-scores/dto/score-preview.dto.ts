import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScorePreviewDto {
  @ApiProperty({ description: 'Match ID for score calculation' })
  @IsString()
  matchId: string;

  @ApiProperty({ description: 'Alliance ID for score calculation' })
  @IsString()
  allianceId: string;

  @ApiProperty({ 
    description: 'Element scores as key-value pairs',
    example: { auto_cone: 3, teleop_cube: 5, endgame_climb: 1 }
  })
  @IsObject()
  elementScores: Record<string, number>;

  @ApiProperty({ 
    description: 'Optional score configuration ID to use',
    required: false
  })
  @IsString()
  @IsOptional()
  scoreConfigId?: string;
}
