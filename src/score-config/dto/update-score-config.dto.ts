import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateScoreSectionDto } from './update-score-section.dto';
import { UpdateScoreElementDto } from './update-score-element.dto';
import { UpdateBonusConditionDto } from './update-bonus-condition.dto';
import { UpdatePenaltyConditionDto } from './update-penalty-condition.dto';

export class UpdateScoreConfigDto {
  @ApiProperty({ description: 'Name of the score configuration', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Description of the score configuration', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Tournament ID this config belongs to', required: false })
  @IsString()
  @IsOptional()
  tournamentId?: string;

  @ApiProperty({ 
    description: 'Formula to calculate total score from sections (e.g., "auto + teleop", "auto * 1.5 + teleop")', 
    required: false 
  })
  @IsString()
  @IsOptional()
  totalScoreFormula?: string;

  @ApiProperty({ description: 'Score sections to update', required: false, type: [UpdateScoreSectionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateScoreSectionDto)
  scoreSections?: UpdateScoreSectionDto[];

  @ApiProperty({ description: 'Score elements to update (legacy)', required: false, type: [UpdateScoreElementDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateScoreElementDto)
  scoreElements?: UpdateScoreElementDto[];

  @ApiProperty({ description: 'Bonus conditions to update (legacy)', required: false, type: [UpdateBonusConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateBonusConditionDto)
  bonusConditions?: UpdateBonusConditionDto[];

  @ApiProperty({ description: 'Penalty conditions to update (legacy)', required: false, type: [UpdatePenaltyConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdatePenaltyConditionDto)
  penaltyConditions?: UpdatePenaltyConditionDto[];
}
