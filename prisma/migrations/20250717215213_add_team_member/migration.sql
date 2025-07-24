/*
  Warnings:

  - You are about to drop the column `avatar` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `organization` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `teamLead` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `teamLeadId` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `teamMembers` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `DateOfBirth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `User` table. All the data in the column will be lost.
  - The `gender` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `referralSource` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Made the column `tournamentId` on table `Team` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_tournamentId_fkey";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "avatar",
DROP COLUMN "description",
DROP COLUMN "organization",
DROP COLUMN "teamLead",
DROP COLUMN "teamLeadId",
DROP COLUMN "teamMembers",
ADD COLUMN     "referralSource" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "tournamentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "maxTeamMembers" INTEGER,
ADD COLUMN     "maxTeams" INTEGER,
ADD COLUMN     "minTeamMembers" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "DateOfBirth",
DROP COLUMN "avatar",
DROP COLUMN "phoneNumber",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'COMMON',
ALTER COLUMN "email" SET NOT NULL,
DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender";

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender",
    "phone" TEXT,
    "email" TEXT,
    "province" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "organization" TEXT,
    "organizationAddress" TEXT,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
