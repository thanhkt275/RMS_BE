import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreatePenaltyConditionDto } from './create-penalty-condition.dto';

export class UpdatePenaltyConditionDto extends PartialType(CreatePenaltyConditionDto) {
  @ApiProperty({ description: 'Penalty condition ID for updates', required: false })
  @IsString()
  @IsOptional()
  id?: string;
}
