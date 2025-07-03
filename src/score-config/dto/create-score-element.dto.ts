import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ElementType } from '../../utils/prisma-types';

export class CreateScoreElementDto {
  @ApiProperty({ description: 'Name of the score element' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unique code for the score element' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Description of the score element', required: false })
  @IsString()
  @IsOptional()
  description?: string;  @ApiProperty({ description: 'Points per unit for this element' })
  @IsNumber()
  pointsPerUnit: number;

  @ApiProperty({ description: 'Maximum units allowed', required: false })
  @IsNumber()
  @IsOptional()
  maxUnits?: number;

  @ApiProperty({ description: 'Category for grouping elements', required: false })
  @IsString()
  @IsOptional()
  category?: string;
  @ApiProperty({ description: 'Type of element: COUNTER, BOOLEAN, or TIMER', enum: ElementType })
  @IsEnum(ElementType)
  elementType: ElementType;
  @ApiProperty({ description: 'Display order in UI', required: false })
  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ description: 'Icon reference', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: 'Color for UI', required: false })
  @IsString()
  @IsOptional()
  color?: string;
}
