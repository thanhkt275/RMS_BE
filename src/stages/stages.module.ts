import { Module } from '@nestjs/common';
import { StagesService } from './stages.service';
import { StageAdvancementService } from './stage-advancement.service';
import { StagesController } from './stages.controller';
import { PrismaService } from '../prisma.service';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [EmailsModule],
  controllers: [StagesController],
  providers: [StagesService, StageAdvancementService, PrismaService],
  exports: [StagesService, StageAdvancementService],
})
export class StagesModule {}