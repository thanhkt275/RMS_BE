import { IsOptional, IsString, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateScoreElementDto } from './update-score-element.dto';
import { UpdateBonusConditionDto } from './update-bonus-condition.dto';
import { UpdatePenaltyConditionDto } from './update-penalty-condition.dto';

export class UpdateScoreSectionDto {
  @ApiProperty({ description: 'Section ID for updates', required: false })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: 'Name of the score section (e.g., "Auto", "Teleop")', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Unique code for the section within the config', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'Description of the score section', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Display order of the section', required: false })
  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ description: 'Score elements in this section', required: false, type: [UpdateScoreElementDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateScoreElementDto)
  scoreElements?: UpdateScoreElementDto[];

  @ApiProperty({ description: 'Bonus conditions for this section', required: false, type: [UpdateBonusConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateBonusConditionDto)
  bonusConditions?: UpdateBonusConditionDto[];

  @ApiProperty({ description: 'Penalty conditions for this section', required: false, type: [UpdatePenaltyConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdatePenaltyConditionDto)
  penaltyConditions?: UpdatePenaltyConditionDto[];
}
