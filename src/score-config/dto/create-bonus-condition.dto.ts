import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBonusConditionDto {
  @ApiProperty({ description: 'Name of the bonus condition' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unique code for the bonus condition' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Description of the bonus condition', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Bonus points awarded' })
  @IsNumber()
  bonusPoints: number;

  @ApiProperty({ description: 'Condition logic as JSON object' })
  @IsObject()
  condition: any;

  @ApiProperty({ description: 'Display order in UI', required: false })
  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}
