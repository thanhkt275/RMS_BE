import { Injectable } from '@nestjs/common';
import { Condition, ConditionEvaluator, ThresholdCondition, CompositeCondition } from '../interfaces/condition.interface';
import { ThresholdConditionEvaluator } from './threshold-condition.strategy';
import { CompositeConditionEvaluator } from './composite-condition.strategy';

@Injectable()
export class ConditionEvaluatorFactory {
  createEvaluator(condition: Condition): ConditionEvaluator {
    switch (condition.type) {
      case 'threshold':
        return new ThresholdConditionEvaluator(condition as ThresholdCondition);
      case 'composite':
        return new CompositeConditionEvaluator(condition as CompositeCondition, this);
      default:
        throw new Error(`Unknown condition type: ${condition.type}`);
    }
  }
}
