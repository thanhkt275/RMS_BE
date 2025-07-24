import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateScoreElementDto } from './create-score-element.dto';
import { CreateBonusConditionDto } from './create-bonus-condition.dto';
import { CreatePenaltyConditionDto } from './create-penalty-condition.dto';
import { CreateScoreSectionDto } from './create-score-section.dto';

export class CreateScoreConfigDto {
  @ApiProperty({ description: 'Name of the score configuration' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of the score configuration', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Tournament ID this config belongs to' })
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

  @ApiProperty({ description: 'Score sections (e.g., auto, teleop)', required: false, type: [CreateScoreSectionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateScoreSectionDto)
  scoreSections?: CreateScoreSectionDto[];

  @ApiProperty({ description: 'Score elements (legacy - use sections instead)', required: false, type: [CreateScoreElementDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateScoreElementDto)
  scoreElements?: CreateScoreElementDto[];

  @ApiProperty({ description: 'Bonus conditions (legacy - use sections instead)', required: false, type: [CreateBonusConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateBonusConditionDto)
  bonusConditions?: CreateBonusConditionDto[];

  @ApiProperty({ description: 'Penalty conditions (legacy - use sections instead)', required: false, type: [CreatePenaltyConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePenaltyConditionDto)
  penaltyConditions?: CreatePenaltyConditionDto[];
}
