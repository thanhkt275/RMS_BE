import { PartialType } from '@nestjs/swagger';
import { CreatePenaltyConditionDto } from './create-penalty-condition.dto';

export class UpdatePenaltyConditionDto extends PartialType(CreatePenaltyConditionDto) {} 