import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateScoreElementDto } from './create-score-element.dto';
import { CreateBonusConditionDto } from './create-bonus-condition.dto';
import { CreatePenaltyConditionDto } from './create-penalty-condition.dto';

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
  @IsNotEmpty()
  tournamentId: string;

  @ApiProperty({ description: 'Score elements', required: false, type: [CreateScoreElementDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateScoreElementDto)
  scoreElements?: CreateScoreElementDto[];

  @ApiProperty({ description: 'Bonus conditions', required: false, type: [CreateBonusConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateBonusConditionDto)
  bonusConditions?: CreateBonusConditionDto[];

  @ApiProperty({ description: 'Penalty conditions', required: false, type: [CreatePenaltyConditionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePenaltyConditionDto)
  penaltyConditions?: CreatePenaltyConditionDto[];
}
