-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'HEAD_REFEREE', 'ALLIANCE_REFEREE', 'TEAM_LEADER', 'TEAM_MEMBER', 'COMMON');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('SWISS', 'PLAYOFF', 'FINAL');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('NONE', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "MatchState" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "DisplayState" AS ENUM ('TEAM_LIST', 'RANKING', 'SCHEDULE', 'LIVE', 'FINAL_RESULTS', 'FINISHED', 'CUSTOM_MESSAGE');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('FULL', 'TELEOP_ENDGAME');

-- CreateEnum
CREATE TYPE "AllianceColor" AS ENUM ('RED', 'BLUE');

-- CreateEnum
CREATE TYPE "MatchRoundType" AS ENUM ('QUALIFICATION', 'SWISS', 'PLAYOFF', 'FINAL');

-- CreateEnum
CREATE TYPE "TimerType" AS ENUM ('AUTO', 'TELEOP', 'ENDGAME', 'FULL_MATCH');

-- CreateEnum
CREATE TYPE "MatchErrorType" AS ENUM ('ROBOT_FAILURE', 'FIELD_FAULT', 'OTHER');

-- CreateEnum
CREATE TYPE "ElementType" AS ENUM ('COUNTER', 'BOOLEAN', 'TIMER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT,
    "gender" BOOLEAN,
    "DateOfBirth" TIMESTAMP(3),
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT NOT NULL,
    "numberOfFields" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StageType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamsPerAlliance" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "roundNumber" INTEGER,
    "status" "MatchState" NOT NULL DEFAULT 'PENDING',
    "startTime" TIMESTAMP(3),
    "scheduledTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "winningAlliance" "AllianceColor",
    "stageId" TEXT NOT NULL,
    "scoredById" TEXT,
    "roundType" "MatchRoundType",
    "scheduleId" TEXT,
    "fieldId" TEXT,
    "matchType" "MatchType" NOT NULL DEFAULT 'FULL',
    "matchDuration" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchReferee" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchReferee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alliance" (
    "id" TEXT NOT NULL,
    "color" "AllianceColor" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "teamNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "avatar" TEXT,
    "description" TEXT,
    "teamLead" TEXT,
    "teamLeadId" TEXT,
    "teamMembers" JSONB,
    "tournamentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAlliance" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "stationPosition" INTEGER NOT NULL DEFAULT 1,
    "isSurrogate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamAlliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamStats" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "stageId" TEXT,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsScored" INTEGER NOT NULL DEFAULT 0,
    "pointsConceded" INTEGER NOT NULL DEFAULT 0,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "rankingPoints" INTEGER NOT NULL DEFAULT 0,
    "opponentWinPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointDifferential" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "tiebreaker1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiebreaker2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" SMALLINT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "tournamentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldDisplay" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "displayState" "DisplayState" NOT NULL DEFAULT 'TEAM_LIST',
    "currentMatchId" TEXT,
    "customMessage" TEXT,
    "lastUpdatedBy" TEXT,
    "autoAdvance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldDisplay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreConfig" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreElement" (
    "id" TEXT NOT NULL,
    "scoreConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "pointsPerUnit" INTEGER NOT NULL,
    "category" TEXT,
    "elementType" "ElementType" NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "icon" TEXT,
    "color" TEXT,

    CONSTRAINT "ScoreElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusCondition" (
    "id" TEXT NOT NULL,
    "scoreConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "bonusPoints" INTEGER NOT NULL,
    "condition" JSONB NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "BonusCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyCondition" (
    "id" TEXT NOT NULL,
    "scoreConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "penaltyPoints" INTEGER NOT NULL,
    "condition" JSONB NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "PenaltyCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchScore" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "scoreElementId" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdById_idx" ON "User"("createdById");

-- CreateIndex
CREATE INDEX "Tournament_adminId_idx" ON "Tournament"("adminId");

-- CreateIndex
CREATE INDEX "Stage_tournamentId_idx" ON "Stage"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_stageId_idx" ON "Match"("stageId");

-- CreateIndex
CREATE INDEX "Match_scoredById_idx" ON "Match"("scoredById");

-- CreateIndex
CREATE INDEX "Match_scheduleId_idx" ON "Match"("scheduleId");

-- CreateIndex
CREATE INDEX "Match_fieldId_idx" ON "Match"("fieldId");

-- CreateIndex
CREATE INDEX "Match_stageId_matchNumber_idx" ON "Match"("stageId", "matchNumber");

-- CreateIndex
CREATE INDEX "Match_status_startTime_idx" ON "Match"("status", "startTime");

-- CreateIndex
CREATE INDEX "MatchReferee_matchId_idx" ON "MatchReferee"("matchId");

-- CreateIndex
CREATE INDEX "MatchReferee_userId_idx" ON "MatchReferee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchReferee_matchId_userId_key" ON "MatchReferee"("matchId", "userId");

-- CreateIndex
CREATE INDEX "Alliance_matchId_idx" ON "Alliance"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamNumber_key" ON "Team"("teamNumber");

-- CreateIndex
CREATE INDEX "Team_tournamentId_idx" ON "Team"("tournamentId");

-- CreateIndex
CREATE INDEX "TeamAlliance_teamId_idx" ON "TeamAlliance"("teamId");

-- CreateIndex
CREATE INDEX "TeamAlliance_allianceId_idx" ON "TeamAlliance"("allianceId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamAlliance_teamId_allianceId_key" ON "TeamAlliance"("teamId", "allianceId");

-- CreateIndex
CREATE INDEX "TeamStats_teamId_idx" ON "TeamStats"("teamId");

-- CreateIndex
CREATE INDEX "TeamStats_tournamentId_idx" ON "TeamStats"("tournamentId");

-- CreateIndex
CREATE INDEX "TeamStats_stageId_idx" ON "TeamStats"("stageId");

-- CreateIndex
CREATE INDEX "TeamStats_tournamentId_stageId_idx" ON "TeamStats"("tournamentId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStats_teamId_tournamentId_key" ON "TeamStats"("teamId", "tournamentId");

-- CreateIndex
CREATE INDEX "Field_tournamentId_idx" ON "Field"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Field_tournamentId_number_key" ON "Field"("tournamentId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "FieldDisplay_fieldId_key" ON "FieldDisplay"("fieldId");

-- CreateIndex
CREATE INDEX "FieldDisplay_fieldId_idx" ON "FieldDisplay"("fieldId");

-- CreateIndex
CREATE INDEX "FieldDisplay_displayState_idx" ON "FieldDisplay"("displayState");

-- CreateIndex
CREATE INDEX "FieldDisplay_lastUpdatedBy_idx" ON "FieldDisplay"("lastUpdatedBy");

-- CreateIndex
CREATE INDEX "ScoreConfig_tournamentId_idx" ON "ScoreConfig"("tournamentId");

-- CreateIndex
CREATE INDEX "ScoreElement_scoreConfigId_idx" ON "ScoreElement"("scoreConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreElement_scoreConfigId_code_key" ON "ScoreElement"("scoreConfigId", "code");

-- CreateIndex
CREATE INDEX "BonusCondition_scoreConfigId_idx" ON "BonusCondition"("scoreConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "BonusCondition_scoreConfigId_code_key" ON "BonusCondition"("scoreConfigId", "code");

-- CreateIndex
CREATE INDEX "PenaltyCondition_scoreConfigId_idx" ON "PenaltyCondition"("scoreConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "PenaltyCondition_scoreConfigId_code_key" ON "PenaltyCondition"("scoreConfigId", "code");

-- CreateIndex
CREATE INDEX "MatchScore_matchId_idx" ON "MatchScore"("matchId");

-- CreateIndex
CREATE INDEX "MatchScore_allianceId_idx" ON "MatchScore"("allianceId");

-- CreateIndex
CREATE INDEX "MatchScore_scoreElementId_idx" ON "MatchScore"("scoreElementId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchScore_matchId_allianceId_scoreElementId_key" ON "MatchScore"("matchId", "allianceId", "scoreElementId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_scoredById_fkey" FOREIGN KEY ("scoredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchReferee" ADD CONSTRAINT "MatchReferee_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchReferee" ADD CONSTRAINT "MatchReferee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alliance" ADD CONSTRAINT "Alliance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAlliance" ADD CONSTRAINT "TeamAlliance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAlliance" ADD CONSTRAINT "TeamAlliance_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStats" ADD CONSTRAINT "TeamStats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStats" ADD CONSTRAINT "TeamStats_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStats" ADD CONSTRAINT "TeamStats_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDisplay" ADD CONSTRAINT "FieldDisplay_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDisplay" ADD CONSTRAINT "FieldDisplay_currentMatchId_fkey" FOREIGN KEY ("currentMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDisplay" ADD CONSTRAINT "FieldDisplay_lastUpdatedBy_fkey" FOREIGN KEY ("lastUpdatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreConfig" ADD CONSTRAINT "ScoreConfig_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreElement" ADD CONSTRAINT "ScoreElement_scoreConfigId_fkey" FOREIGN KEY ("scoreConfigId") REFERENCES "ScoreConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusCondition" ADD CONSTRAINT "BonusCondition_scoreConfigId_fkey" FOREIGN KEY ("scoreConfigId") REFERENCES "ScoreConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyCondition" ADD CONSTRAINT "PenaltyCondition_scoreConfigId_fkey" FOREIGN KEY ("scoreConfigId") REFERENCES "ScoreConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchScore" ADD CONSTRAINT "MatchScore_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchScore" ADD CONSTRAINT "MatchScore_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchScore" ADD CONSTRAINT "MatchScore_scoreElementId_fkey" FOREIGN KEY ("scoreElementId") REFERENCES "ScoreElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
