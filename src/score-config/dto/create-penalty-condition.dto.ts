import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePenaltyConditionDto {
  @ApiProperty({ description: 'Name of the penalty condition' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unique code for the penalty condition' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Description of the penalty condition', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Penalty points (negative value)' })
  @IsNumber()
  penaltyPoints: number;

  @ApiProperty({ description: 'Condition logic as JSON object' })
  @IsObject()
  condition: any;

  @ApiProperty({ description: 'Display order in UI', required: false })
  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}
