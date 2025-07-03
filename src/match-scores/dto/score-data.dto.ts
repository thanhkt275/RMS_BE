import { CreateMatchScoresDto } from '../dto';

/**
 * Data Transfer Object for score operations
 * Encapsulates score data and provides factory methods
 */
export class ScoreDataDto {
  constructor(
    public readonly matchId: string,
    public readonly redAutoScore: number,
    public readonly redDriveScore: number,
    public readonly redTotalScore: number,
    public readonly blueAutoScore: number,
    public readonly blueDriveScore: number,
    public readonly blueTotalScore: number,
    public readonly redPenalty: number = 0,
    public readonly bluePenalty: number = 0
  ) {}

  /**
   * Creates ScoreDataDto from CreateMatchScoresDto
   */
  static fromCreateDto(dto: CreateMatchScoresDto): ScoreDataDto {
    const redAutoScore = (dto as any).redAutoScore || 0;
    const redDriveScore = (dto as any).redDriveScore || 0;
    const blueAutoScore = (dto as any).blueAutoScore || 0;
    const blueDriveScore = (dto as any).blueDriveScore || 0;

    // Use provided totals or calculate from auto + drive
    const redTotalScore = (dto as any).redTotalScore || (redAutoScore + redDriveScore);
    const blueTotalScore = (dto as any).blueTotalScore || (blueAutoScore + blueDriveScore);

    // Extract penalties from scoreDetails if present
    const redPenalty = dto.scoreDetails?.penalties?.red ?? 0;
    const bluePenalty = dto.scoreDetails?.penalties?.blue ?? 0;

    return new ScoreDataDto(
      dto.matchId,
      redAutoScore,
      redDriveScore,
      redTotalScore,
      blueAutoScore,
      blueDriveScore,
      blueTotalScore,
      redPenalty,
      bluePenalty
    );
  }

  /**
   * Validates the score data
   */
  validate(): void {
    if (!this.matchId) {
      throw new Error('Match ID is required');
    }

    const scores = {
      redAutoScore: this.redAutoScore,
      redDriveScore: this.redDriveScore,
      blueAutoScore: this.blueAutoScore,
      blueDriveScore: this.blueDriveScore,
    };

    // Check for negative scores
    const invalidScores = Object.entries(scores).filter(([, value]) => value < 0);
    if (invalidScores.length > 0) {
      throw new Error(`Scores cannot be negative: ${invalidScores.map(([key]) => key).join(', ')}`);
    }
  }

  /**
   * Converts to legacy format response
   */
  toLegacyFormat(): any {
    return {
      id: this.matchId,
      matchId: this.matchId,
      redAutoScore: this.redAutoScore,
      redDriveScore: this.redDriveScore,
      redTotalScore: this.redTotalScore,
      blueAutoScore: this.blueAutoScore,
      blueDriveScore: this.blueDriveScore,
      blueTotalScore: this.blueTotalScore,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
