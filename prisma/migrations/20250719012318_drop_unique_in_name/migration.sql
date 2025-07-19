/*
  Warnings:

  - You are about to drop the column `phone` on the `TeamMember` table. All the data in the column will be lost.
  - You are about to drop the column `DateOfBirth` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_name_key";

-- AlterTable
ALTER TABLE "TeamMember" DROP COLUMN "phone",
ADD COLUMN     "phoneNumber" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "DateOfBirth",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3);
