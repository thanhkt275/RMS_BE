import { Module } from '@nestjs/common';
import { ScoreConfigController } from './score-config.controller';
import { ScoreConfigService } from './score-config.service';
import { ScoreCalculationService } from './score-calculation.service';
import { FormulaEvaluatorService } from './formula-evaluator.service';
import { ConditionEvaluatorFactory } from './strategies/condition-evaluator.factory';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ScoreConfigController],
  providers: [
    ScoreConfigService,
    ScoreCalculationService,
    FormulaEvaluatorService,
    ConditionEvaluatorFactory,
    PrismaService,
  ],
  exports: [ScoreConfigService, ScoreCalculationService, FormulaEvaluatorService],
})
export class ScoreConfigModule {}
