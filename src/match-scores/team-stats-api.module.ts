import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TeamStatsApiService } from './team-stats-api.service';
import { TeamStatsApiController } from './team-stats-api.controller';
import { TeamStatsService } from './team-stats.service';

@Module({
  controllers: [TeamStatsApiController],
  providers: [TeamStatsApiService, TeamStatsService, PrismaService],
  exports: [TeamStatsApiService],
})
export class TeamStatsApiModule {}
