import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateBonusConditionDto } from './create-bonus-condition.dto';

export class UpdateBonusConditionDto extends PartialType(CreateBonusConditionDto) {
  @ApiProperty({ description: 'Bonus condition ID for updates', required: false })
  @IsString()
  @IsOptional()
  id?: string;
}
