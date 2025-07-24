import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateScoreElementDto } from './create-score-element.dto';
import { CreateBonusConditionDto } from './create-bonus-condition.dto';
import { CreatePenaltyConditionDto } from './create-penalty-condition.dto';

export class CreateScoreSectionDto {
  @ApiProperty({ description: 'Name of the score section (e.g., "Auto", "Teleop")' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unique code for the section within the config' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Description of the score section', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Display order of the section', required: false })
  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ description: 'Score elements for this section', required: false, type: [CreateScoreElementDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateScoreElementDto)
  scoreElements?: CreateScoreElementDto[];

  @ApiProperty({ description: 'Bonus conditions for this section', required: false, type: [CreateBonusConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateBonusConditionDto)
  bonusConditions?: CreateBonusConditionDto[];

  @ApiProperty({ description: 'Penalty conditions for this section', required: false, type: [CreatePenaltyConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePenaltyConditionDto)
  penaltyConditions?: CreatePenaltyConditionDto[];
}
