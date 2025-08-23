-- AlterTable
ALTER TABLE "Stage" ADD COLUMN     "advancementRules" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isElimination" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxTeams" INTEGER;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "registrationDeadline" TIMESTAMP(3);
