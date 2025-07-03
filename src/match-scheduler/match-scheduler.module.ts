import { Module } from '@nestjs/common';
import { MatchSchedulerService } from './match-scheduler.service';
import { MatchSchedulerController } from './match-scheduler.controller';
import { PrismaService } from '../prisma.service';
import { SchedulingStrategyFactory } from './factories/scheduling-strategy.factory';
import { FieldAssignmentService } from './services/field-assignment.service';
import { MatchupHistoryService } from './services/matchup-history.service';
import { SwissSchedulingStrategy } from './strategies/swiss-scheduling.strategy';
import { FrcSchedulingStrategy } from './strategies/frc-scheduling.strategy';
import { PlayoffSchedulingStrategy } from './strategies/playoff-scheduling.strategy';
import { FrcScheduler } from './frc-scheduler';
import { SwissScheduler } from './swiss-scheduler';
import { PlayoffScheduler } from './playoff-scheduler';
import { ISchedulingStrategy } from './interfaces/scheduling-strategy.interface';

@Module({
  providers: [
    MatchSchedulerService,
    PrismaService,
    SchedulingStrategyFactory,
    FieldAssignmentService,
    MatchupHistoryService,
    FrcScheduler,
    SwissScheduler,
    PlayoffScheduler,
    SwissSchedulingStrategy,
    FrcSchedulingStrategy,
    PlayoffSchedulingStrategy,
    {
      provide: 'SCHEDULING_STRATEGIES',
      useFactory: (
        swissStrategy: SwissSchedulingStrategy,
        frcStrategy: FrcSchedulingStrategy,
        playoffStrategy: PlayoffSchedulingStrategy
      ): ISchedulingStrategy[] => [swissStrategy, frcStrategy, playoffStrategy],
      inject: [SwissSchedulingStrategy, FrcSchedulingStrategy, PlayoffSchedulingStrategy],
    },
    {
      provide: SchedulingStrategyFactory,
      useFactory: (strategies: ISchedulingStrategy[]) => new SchedulingStrategyFactory(strategies),
      inject: ['SCHEDULING_STRATEGIES'],
    },
  ],
  controllers: [MatchSchedulerController],
  exports: [MatchSchedulerService, SchedulingStrategyFactory],
})
export class MatchSchedulerModule { }