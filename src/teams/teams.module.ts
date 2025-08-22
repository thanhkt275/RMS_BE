import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { PrismaService } from '../prisma.service';
import { EmailsModule } from '../emails/emails.module';
import { DateValidationService } from '../common/services/date-validation.service';

@Module({
  imports: [EmailsModule],
  controllers: [TeamsController],
  providers: [TeamsService, PrismaService, DateValidationService],
  exports: [TeamsService],
})
export class TeamsModule {}
