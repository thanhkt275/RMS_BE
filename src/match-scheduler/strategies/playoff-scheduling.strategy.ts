import { Injectable } from '@nestjs/common';
import { ISchedulingStrategy, PlayoffSchedulingOptions } from '../interfaces/scheduling-strategy.interface';
import { Match, Stage, Team, StageType } from '../../utils/prisma-types';
import { PlayoffScheduler } from '../playoff-scheduler';

/**
 * Playoff tournament scheduling strategy
 * Implements the Strategy pattern for playoff-style tournaments
 */
@Injectable()
export class PlayoffSchedulingStrategy implements ISchedulingStrategy {

  constructor(private readonly playoffScheduler: PlayoffScheduler) {}

  canHandle(stage: Stage): boolean {
    return stage.type === StageType.PLAYOFF || stage.type === StageType.FINAL;
  }

  getStrategyType(): string {
    return 'PLAYOFF';
  }

  async generateMatches(
    stage: Stage & { tournament: any; teams: Team[] },
    options: PlayoffSchedulingOptions
  ): Promise<Match[]> {
    const { numberOfRounds } = options;

    return this.playoffScheduler.generatePlayoffSchedule(stage, numberOfRounds);
  }
}
