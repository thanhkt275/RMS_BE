import { Module, forwardRef, Inject } from '@nestjs/common';
import { MatchScoresService } from './match-scores.service';
import { MatchScoresController } from './match-scores.controller';
import { RankingController } from './ranking.controller';
import { PrismaService } from '../prisma.service';
import { ScoreCalculationService } from './services/score-calculation.service';
import { AllianceRepository } from './services/alliance.repository';
import { MatchResultService } from './services/match-result.service';
import { TeamStatsService } from './team-stats.service';
import { ITeamStatsService } from './interfaces/team-stats.interface';
import { RankingUpdateService } from './ranking-update.service';
import { TeamStatsApiModule } from './team-stats-api.module';

@Module({
  imports: [TeamStatsApiModule],
  controllers: [MatchScoresController, RankingController],
  providers: [
    MatchScoresService,
    PrismaService,
    ScoreCalculationService,
    AllianceRepository,
    MatchResultService,
    RankingUpdateService,
    {
      provide: 'ITeamStatsService',
      useClass: TeamStatsService,
    },
  ],
  exports: [MatchScoresService, RankingUpdateService]
})
export class MatchScoresModule {}