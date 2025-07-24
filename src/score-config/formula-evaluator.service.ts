import { Injectable } from '@nestjs/common';

@Injectable()
export class FormulaEvaluatorService {
  /**
   * Evaluates a mathematical formula with section variables
   * @param formula - The formula string (e.g., "auto + teleop", "auto * 1.5 + teleop")
   * @param sectionScores - Object containing section scores { auto: 10, teleop: 20 }
   * @returns The calculated total score
   */
  evaluateFormula(formula: string, sectionScores: Record<string, number>): number {
    if (!formula || !formula.trim()) {
      // If no formula is provided, sum all section scores
      return Object.values(sectionScores).reduce((sum, score) => sum + score, 0);
    }

    try {
      // Replace section variables with their actual scores
      let evaluatedFormula = formula;
      
      for (const [sectionCode, score] of Object.entries(sectionScores)) {
        // Use word boundaries to ensure we don't replace partial matches
        const regex = new RegExp(`\\b${sectionCode}\\b`, 'g');
        evaluatedFormula = evaluatedFormula.replace(regex, score.toString());
      }

      // Validate that the formula only contains allowed characters
      if (!this.isValidFormula(evaluatedFormula)) {
        throw new Error('Formula contains invalid characters');
      }

      // Evaluate the mathematical expression
      const result = this.safeEvaluate(evaluatedFormula);
      
      return Math.round(result * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error evaluating formula:', error);
      // Fallback to sum of all sections if formula evaluation fails
      return Object.values(sectionScores).reduce((sum, score) => sum + score, 0);
    }
  }

  /**
   * Validates that a formula only contains safe mathematical operations
   * @param formula - The formula to validate
   * @returns true if formula is safe to evaluate
   */
  private isValidFormula(formula: string): boolean {
    // Only allow numbers, basic math operators, parentheses, and whitespace
    const allowedPattern = /^[\d\s+\-*/().]+$/;
    return allowedPattern.test(formula);
  }

  /**
   * Safely evaluates a mathematical expression without using eval()
   * @param expression - The mathematical expression to evaluate
   * @returns The result of the evaluation
   */
  private safeEvaluate(expression: string): number {
    // Remove all whitespace
    expression = expression.replace(/\s/g, '');
    
    // Simple recursive descent parser for basic arithmetic
    return this.parseExpression(expression, { pos: 0 });
  }

  private parseExpression(expr: string, context: { pos: number }): number {
    let result = this.parseTerm(expr, context);
    
    while (context.pos < expr.length) {
      const op = expr[context.pos];
      if (op === '+' || op === '-') {
        context.pos++;
        const term = this.parseTerm(expr, context);
        result = op === '+' ? result + term : result - term;
      } else {
        break;
      }
    }
    
    return result;
  }

  private parseTerm(expr: string, context: { pos: number }): number {
    let result = this.parseFactor(expr, context);
    
    while (context.pos < expr.length) {
      const op = expr[context.pos];
      if (op === '*' || op === '/') {
        context.pos++;
        const factor = this.parseFactor(expr, context);
        result = op === '*' ? result * factor : result / factor;
      } else {
        break;
      }
    }
    
    return result;
  }

  private parseFactor(expr: string, context: { pos: number }): number {
    if (context.pos >= expr.length) {
      throw new Error('Unexpected end of expression');
    }
    
    if (expr[context.pos] === '(') {
      context.pos++; // Skip '('
      const result = this.parseExpression(expr, context);
      if (context.pos >= expr.length || expr[context.pos] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      context.pos++; // Skip ')'
      return result;
    }
    
    // Handle negative numbers
    if (expr[context.pos] === '-') {
      context.pos++;
      return -this.parseFactor(expr, context);
    }
    
    // Parse number
    let numStr = '';
    while (context.pos < expr.length && /[\d.]/.test(expr[context.pos])) {
      numStr += expr[context.pos];
      context.pos++;
    }
    
    if (numStr === '') {
      throw new Error('Expected number');
    }
    
    return parseFloat(numStr);
  }

  /**
   * Validates a formula syntax before saving
   * @param formula - The formula to validate
   * @param sectionCodes - Array of valid section codes
   * @returns Validation result with success status and error message
   */
  validateFormulaSyntax(formula: string, sectionCodes: string[]): { isValid: boolean; error?: string } {
    if (!formula || !formula.trim()) {
      return { isValid: true }; // Empty formula is valid (will sum all sections)
    }

    try {
      // Check if all variables in formula are valid section codes
      const variables = this.extractVariables(formula);
      const invalidVariables = variables.filter(variable => !sectionCodes.includes(variable));
      
      if (invalidVariables.length > 0) {
        return {
          isValid: false,
          error: `Invalid section codes in formula: ${invalidVariables.join(', ')}`
        };
      }

      // Test evaluate with dummy data
      const testScores: Record<string, number> = {};
      sectionCodes.forEach(code => {
        testScores[code] = 1; // Use 1 for all sections to test formula
      });

      this.evaluateFormula(formula, testScores);
      
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Formula syntax error: ${error.message}`
      };
    }
  }

  /**
   * Extracts variable names from a formula
   * @param formula - The formula to analyze
   * @returns Array of variable names found in the formula
   */
  private extractVariables(formula: string): string[] {
    const variables = new Set<string>();
    const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    let match;
    
    while ((match = variablePattern.exec(formula)) !== null) {
      variables.add(match[0]);
    }
    
    return Array.from(variables);
  }
}
