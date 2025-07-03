-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "Stage" ADD COLUMN     "status" "StageStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "currentStageId" TEXT;

-- CreateIndex
CREATE INDEX "Team_currentStageId_idx" ON "Team"("currentStageId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
