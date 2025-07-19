/*
  Warnings:

  - You are about to drop the column `referralSource` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `maxTeamMembers` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `maxTeams` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `minTeamMembers` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - The `gender` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `TeamMember` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "GENDER" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_userId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_teamId_fkey";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "referralSource",
DROP COLUMN "userId",
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "teamLead" TEXT,
ADD COLUMN     "teamLeadId" TEXT,
ADD COLUMN     "teamMembers" JSONB,
ALTER COLUMN "tournamentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "maxTeamMembers",
DROP COLUMN "maxTeams",
DROP COLUMN "minTeamMembers";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "DateOfBirth" TIMESTAMP(3),
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ALTER COLUMN "role" DROP DEFAULT,
ALTER COLUMN "email" DROP NOT NULL,
DROP COLUMN "gender",
ADD COLUMN     "gender" "GENDER";

-- DropTable
DROP TABLE "TeamMember";

-- DropEnum
DROP TYPE "Gender";

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;
