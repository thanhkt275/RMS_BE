import { Module } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { FieldRefereesModule } from '../field-referees/field-referees.module';
import { PrismaService } from '../prisma.service';
import { DateValidationService } from '../common/services/date-validation.service';

@Module({
  imports: [FieldRefereesModule],
  controllers: [TournamentsController],
  providers: [TournamentsService, PrismaService, DateValidationService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
