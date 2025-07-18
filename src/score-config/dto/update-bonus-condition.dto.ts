import { PartialType } from '@nestjs/swagger';
import { CreateBonusConditionDto } from './create-bonus-condition.dto';

export class UpdateBonusConditionDto extends PartialType(CreateBonusConditionDto) {} 