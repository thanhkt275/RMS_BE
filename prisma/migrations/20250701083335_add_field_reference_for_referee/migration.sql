-- CreateTable
CREATE TABLE "field_referees" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHeadRef" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_referees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_referees_fieldId_idx" ON "field_referees"("fieldId");

-- CreateIndex
CREATE INDEX "field_referees_userId_idx" ON "field_referees"("userId");

-- CreateIndex
CREATE INDEX "field_referees_fieldId_isHeadRef_idx" ON "field_referees"("fieldId", "isHeadRef");

-- CreateIndex
CREATE UNIQUE INDEX "field_referees_fieldId_userId_key" ON "field_referees"("fieldId", "userId");

-- AddForeignKey
ALTER TABLE "field_referees" ADD CONSTRAINT "field_referees_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_referees" ADD CONSTRAINT "field_referees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
