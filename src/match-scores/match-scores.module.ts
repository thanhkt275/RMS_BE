import { Module } from '@nestjs/common';
import { MatchScoresService } from './match-scores.service';
import { MatchScoresController } from './match-scores.controller';
import { PrismaService } from '../prisma.service';
import { ScoreCalculationService } from './services/score-calculation.service';
import { AllianceRepository } from './services/alliance.repository';
import { MatchResultService } from './services/match-result.service';
import { TeamStatsService } from './team-stats.service';
import { ITeamStatsService } from './interfaces/team-stats.interface';


@Module({
  controllers: [MatchScoresController],
  providers: [
    MatchScoresService,
    PrismaService,
    ScoreCalculationService,
    AllianceRepository,
    MatchResultService,
    {
      provide: 'ITeamStatsService',
      useClass: TeamStatsService,
    },
  ],
  exports: [MatchScoresService]
})
export class MatchScoresModule {}