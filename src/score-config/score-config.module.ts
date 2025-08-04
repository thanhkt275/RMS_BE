import { Module } from '@nestjs/common';
import { ScoreConfigController } from './score-config.controller';
import { ScoreConfigService } from './score-config.service';
import { ScoreCalculationService } from './score-calculation.service';
import { ConditionEvaluatorFactory } from './strategies/condition-evaluator.factory';
import { PrismaService } from '../prisma.service';
import { MatchScoresModule } from '../match-scores/match-scores.module';

@Module({
  imports: [MatchScoresModule],
  controllers: [ScoreConfigController],
  providers: [
    ScoreConfigService,
    ScoreCalculationService,
    ConditionEvaluatorFactory,
    PrismaService,
  ],
  exports: [ScoreConfigService, ScoreCalculationService],
})
export class ScoreConfigModule {}
