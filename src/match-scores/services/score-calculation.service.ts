import { Injectable } from '@nestjs/common';
import { AllianceColor } from '../../utils/prisma-types';

export interface AllianceScores {
  autoScore: number;
  driveScore: number;
  totalScore: number;
}

export interface MatchScores {
  redScores: AllianceScores;
  blueScores: AllianceScores;
  winningAlliance: AllianceColor | null;
}

/**
 * Service responsible for calculating match scores and determining winners

 */
@Injectable()
export class ScoreCalculationService {
  /**
   * Calculates total score from auto and drive components
   */
  calculateTotalScore(autoScore: number, driveScore: number): number {
    return (autoScore || 0) + (driveScore || 0);
  }

  /**
   * Determines the winning alliance based on total scores
   */
  determineWinner(redTotalScore: number, blueTotalScore: number): AllianceColor | null {
    if (redTotalScore > blueTotalScore) return AllianceColor.RED;
    if (blueTotalScore > redTotalScore) return AllianceColor.BLUE;
    return null; // Tie
  }

  /**
   * Calculates all match scores and determines winner
   */
  calculateMatchScores(
    redAutoScore: number,
    redDriveScore: number,
    blueAutoScore: number,
    blueDriveScore: number
  ): MatchScores {
    const redTotalScore = this.calculateTotalScore(redAutoScore, redDriveScore);
    const blueTotalScore = this.calculateTotalScore(blueAutoScore, blueDriveScore);

    return {
      redScores: {
        autoScore: redAutoScore || 0,
        driveScore: redDriveScore || 0,
        totalScore: redTotalScore,
      },
      blueScores: {
        autoScore: blueAutoScore || 0,
        driveScore: blueDriveScore || 0,
        totalScore: blueTotalScore,
      },
      winningAlliance: this.determineWinner(redTotalScore, blueTotalScore),
    };
  }

  /**
   * Validates score inputs
   */
  validateScores(scores: { [key: string]: number }): void {
    const invalidScores = Object.entries(scores).filter(
      ([key, value]) => value < 0 || !Number.isInteger(value)
    );

    if (invalidScores.length > 0) {
      throw new Error(`Invalid scores: ${invalidScores.map(([key]) => key).join(', ')} must be non-negative integers`);
    }
  }
}
