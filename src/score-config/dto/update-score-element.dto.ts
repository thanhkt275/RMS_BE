import { PartialType } from '@nestjs/swagger';
import { CreateScoreElementDto } from './create-score-element.dto';

export class UpdateScoreElementDto extends PartialType(CreateScoreElementDto) {} 