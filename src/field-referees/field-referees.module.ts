import { Module } from '@nestjs/common';
import { FieldRefereesService } from './field-referees.service';
import { FieldRefereesController } from './field-referees.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [FieldRefereesController],
  providers: [FieldRefereesService, PrismaService],
  exports: [FieldRefereesService],
})
export class FieldRefereesModule {}
