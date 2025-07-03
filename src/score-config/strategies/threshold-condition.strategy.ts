import { Condition, ConditionEvaluator, ThresholdCondition } from '../interfaces/condition.interface';

export class ThresholdConditionEvaluator implements ConditionEvaluator {
  private elementCode: string;
  private operator: string;
  private value: number;
  
  constructor(condition: ThresholdCondition) {
    this.elementCode = condition.elementCode;
    this.operator = condition.operator;
    this.value = condition.value;
  }
  
  evaluate(elementScores: Record<string, number>): boolean {
    const elementValue = elementScores[this.elementCode] || 0;
    
    switch (this.operator) {
      case '==': return elementValue === this.value;
      case '!=': return elementValue !== this.value;
      case '>': return elementValue > this.value;
      case '>=': return elementValue >= this.value;
      case '<': return elementValue < this.value;
      case '<=': return elementValue <= this.value;
      default: throw new Error(`Unknown operator: ${this.operator}`);
    }
  }
}
