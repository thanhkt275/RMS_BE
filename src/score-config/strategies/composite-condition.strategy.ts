import { Condition, ConditionEvaluator, CompositeCondition } from '../interfaces/condition.interface';
import { ConditionEvaluatorFactory } from './condition-evaluator.factory';

export class CompositeConditionEvaluator implements ConditionEvaluator {
  private operator: string;
  private conditions: ConditionEvaluator[];
  
  constructor(
    condition: CompositeCondition,
    private factory: ConditionEvaluatorFactory,
  ) {
    this.operator = condition.operator;
    this.conditions = condition.conditions.map(c => factory.createEvaluator(c));
  }
  
  evaluate(elementScores: Record<string, number>): boolean {
    if (this.operator === 'AND') {
      return this.conditions.every(c => c.evaluate(elementScores));
    } else if (this.operator === 'OR') {
      return this.conditions.some(c => c.evaluate(elementScores));
    } else {
      throw new Error(`Unknown composite operator: ${this.operator}`);
    }
  }
}
