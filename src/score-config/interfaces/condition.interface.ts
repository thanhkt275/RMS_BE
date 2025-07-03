export interface Condition {
  type: string;
  [key: string]: any;
}

export interface ConditionEvaluator {
  evaluate(elementScores: Record<string, number>): boolean;
}

export interface ThresholdCondition extends Condition {
  type: 'threshold';
  elementCode: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=';
  value: number;
}

export interface CompositeCondition extends Condition {
  type: 'composite';
  operator: 'AND' | 'OR';
  conditions: Condition[];
}
