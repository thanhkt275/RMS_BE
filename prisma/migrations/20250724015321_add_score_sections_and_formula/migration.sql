/*
  Warnings:

  - A unique constraint covering the columns `[scoreSectionId,code]` on the table `BonusCondition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scoreSectionId,code]` on the table `PenaltyCondition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scoreSectionId,code]` on the table `ScoreElement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BonusCondition" ADD COLUMN     "scoreSectionId" TEXT,
ALTER COLUMN "scoreConfigId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PenaltyCondition" ADD COLUMN     "scoreSectionId" TEXT,
ALTER COLUMN "scoreConfigId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ScoreConfig" ADD COLUMN     "totalScoreFormula" TEXT;

-- AlterTable
ALTER TABLE "ScoreElement" ADD COLUMN     "scoreSectionId" TEXT,
ALTER COLUMN "scoreConfigId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ScoreSection" (
    "id" TEXT NOT NULL,
    "scoreConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreSection_scoreConfigId_idx" ON "ScoreSection"("scoreConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSection_scoreConfigId_code_key" ON "ScoreSection"("scoreConfigId", "code");

-- CreateIndex
CREATE INDEX "BonusCondition_scoreSectionId_idx" ON "BonusCondition"("scoreSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "BonusCondition_scoreSectionId_code_key" ON "BonusCondition"("scoreSectionId", "code");

-- CreateIndex
CREATE INDEX "PenaltyCondition_scoreSectionId_idx" ON "PenaltyCondition"("scoreSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "PenaltyCondition_scoreSectionId_code_key" ON "PenaltyCondition"("scoreSectionId", "code");

-- CreateIndex
CREATE INDEX "ScoreElement_scoreSectionId_idx" ON "ScoreElement"("scoreSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreElement_scoreSectionId_code_key" ON "ScoreElement"("scoreSectionId", "code");

-- AddForeignKey
ALTER TABLE "ScoreSection" ADD CONSTRAINT "ScoreSection_scoreConfigId_fkey" FOREIGN KEY ("scoreConfigId") REFERENCES "ScoreConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreElement" ADD CONSTRAINT "ScoreElement_scoreSectionId_fkey" FOREIGN KEY ("scoreSectionId") REFERENCES "ScoreSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusCondition" ADD CONSTRAINT "BonusCondition_scoreSectionId_fkey" FOREIGN KEY ("scoreSectionId") REFERENCES "ScoreSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyCondition" ADD CONSTRAINT "PenaltyCondition_scoreSectionId_fkey" FOREIGN KEY ("scoreSectionId") REFERENCES "ScoreSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
