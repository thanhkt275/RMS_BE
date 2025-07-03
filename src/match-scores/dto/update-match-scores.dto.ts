import { PartialType } from '@nestjs/swagger';
import { CreateMatchScoresDto } from './create-match-scores.dto';

export class UpdateMatchScoresDto extends PartialType(CreateMatchScoresDto) {}