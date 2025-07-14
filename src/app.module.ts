import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TeamsModule } from './teams/teams.module';
import { StagesModule } from './stages/stages.module';
import { MatchesModule } from './matches/matches.module';
import { MatchScoresModule } from './match-scores/match-scores.module';
import { MatchSchedulerModule } from './match-scheduler/match-scheduler.module';
import { FieldRefereesModule } from './field-referees/field-referees.module';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './prisma.service';
import { EventsGateway } from './websockets/events.gateway';
import { TeamStatsApiModule } from './match-scores/team-stats-api.module';
import { ScoreConfigModule } from './score-config/score-config.module';
import { EmailsModule } from './emails/emails.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    TournamentsModule,
    TeamsModule,
    StagesModule,
    MatchesModule,
    MatchScoresModule,
    MatchSchedulerModule,
    FieldRefereesModule,
    TeamStatsApiModule,
    ScoreConfigModule,
    EmailsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, EventsGateway],
})
export class AppModule implements OnModuleInit {
  constructor(private authService: AuthService) {}

  async onModuleInit() {
    // Create default admin account when application starts
    try {
      await this.authService.createDefaultAdmin();
      console.log('Admin initialization completed');
    } catch (error) {
      console.error('Error creating default admin account:', error.message);
    }
  }
}
