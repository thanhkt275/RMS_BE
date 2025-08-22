import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { MatchUpdatesController } from '../controllers/match-updates.controller';
import { PrismaService } from '../prisma.service';
import { MatchScoresModule } from '../match-scores/match-scores.module';
import { TeamStatsApiModule } from '../match-scores/team-stats-api.module';
import { MatchChangeDetectionService } from './match-change-detection.service';
import { DateValidationService } from '../common/services/date-validation.service';

@Module({
  imports: [MatchScoresModule, TeamStatsApiModule],
  controllers: [MatchesController, MatchUpdatesController],
  providers: [MatchesService, MatchChangeDetectionService, PrismaService, DateValidationService],
  exports: [MatchesService, MatchChangeDetectionService],
})
export class MatchesModule {}