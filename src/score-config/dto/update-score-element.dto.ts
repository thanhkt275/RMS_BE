import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateScoreElementDto } from './create-score-element.dto';

export class UpdateScoreElementDto extends PartialType(CreateScoreElementDto) {
  @ApiProperty({ description: 'Element ID for updates', required: false })
  @IsString()
  @IsOptional()
  id?: string;
}
