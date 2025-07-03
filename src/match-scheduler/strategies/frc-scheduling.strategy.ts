import { Injectable } from '@nestjs/common';
import { ISchedulingStrategy, FrcSchedulingOptions } from '../interfaces/scheduling-strategy.interface';
import { Match, Stage, Team, StageType } from '../../utils/prisma-types';
import { FrcScheduler } from '../frc-scheduler';

/**
 * FRC tournament scheduling strategy
 * Implements the Strategy pattern for FRC-style tournaments
 */
@Injectable()
export class FrcSchedulingStrategy implements ISchedulingStrategy {
  private readonly DEFAULT_TEAMS_PER_ALLIANCE = 2;

  constructor(private readonly frcScheduler: FrcScheduler) {}
  canHandle(stage: Stage): boolean {
    // FRC scheduling can be used for Swiss stages when doing qualification rounds
    return stage.type === StageType.SWISS;
  }

  getStrategyType(): string {
    return 'FRC';
  }

  async generateMatches(
    stage: Stage & { tournament: any; teams: Team[] },
    options: FrcSchedulingOptions
  ): Promise<Match[]> {
    const {
      rounds,
      teamsPerAlliance = this.DEFAULT_TEAMS_PER_ALLIANCE,
      minMatchSeparation = 1,
      maxIterations,
      qualityLevel = 'medium'
    } = options;

    if (teamsPerAlliance !== this.DEFAULT_TEAMS_PER_ALLIANCE) {
      console.warn(`Requested ${teamsPerAlliance} teams per alliance, but currently only ${this.DEFAULT_TEAMS_PER_ALLIANCE} is supported.`);
    }

    return this.frcScheduler.generateFrcSchedule(
      stage,
      rounds,
      minMatchSeparation,
      maxIterations,
      qualityLevel
    );
  }
}
