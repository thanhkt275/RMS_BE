import { Module } from '@nestjs/common';
import { ScoreConfigController } from './score-config.controller';
import { ScoreConfigService } from './score-config.service';
import { ScoreCalculationService } from './score-calculation.service';
import { FormulaEvaluatorService } from './formula-evaluator.service';
import { ConditionEvaluatorFactory } from './strategies/condition-evaluator.factory';
import { ScoreConfigResolutionService } from './score-config-resolution.service';
import { PrismaService } from '../prisma.service';
import { MatchScoresModule } from '../match-scores/match-scores.module';

@Module({
  imports: [MatchScoresModule],
  controllers: [ScoreConfigController],
  providers: [
    ScoreConfigService,
    ScoreCalculationService,
    FormulaEvaluatorService,
    ConditionEvaluatorFactory,
    ScoreConfigResolutionService,
    PrismaService,
  ],
  exports: [ScoreConfigService, ScoreCalculationService, FormulaEvaluatorService, ScoreConfigResolutionService,],
})
export class ScoreConfigModule {}
