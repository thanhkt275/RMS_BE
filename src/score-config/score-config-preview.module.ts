import { Module } from '@nestjs/common';
import { ScoreConfigPreviewController } from './score-config-preview.controller';
import { ScoreConfigPreviewService } from './score-config-preview.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ScoreConfigPreviewController],
  providers: [
    ScoreConfigPreviewService,
    PrismaService,
  ],
  exports: [ScoreConfigPreviewService],
})
export class ScoreConfigPreviewModule {}
