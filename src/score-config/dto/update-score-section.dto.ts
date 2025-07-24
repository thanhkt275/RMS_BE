import { PartialType } from '@nestjs/swagger';
import { CreateScoreSectionDto } from './create-score-section.dto';

export class UpdateScoreSectionDto extends PartialType(CreateScoreSectionDto) {}
