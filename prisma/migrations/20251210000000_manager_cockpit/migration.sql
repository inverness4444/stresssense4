-- Create ActionCenterItem for manager cockpit
CREATE TABLE IF NOT EXISTS "ActionCenterItem" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "managerUserId" TEXT,
    "type" TEXT NOT NULL,
    "sourceRef" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "completedAt" TIMESTAMP,
    "completedByUserId" TEXT,
    CONSTRAINT "ActionCenterItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActionCenterItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActionCenterItem_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActionCenterItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ActionCenterItem_org_idx" ON "ActionCenterItem"("organizationId");
CREATE INDEX IF NOT EXISTS "ActionCenterItem_team_idx" ON "ActionCenterItem"("teamId");
CREATE INDEX IF NOT EXISTS "ActionCenterItem_manager_idx" ON "ActionCenterItem"("managerUserId");
CREATE INDEX IF NOT EXISTS "ActionCenterItem_status_idx" ON "ActionCenterItem"("status");

-- TeamStatusSnapshot pre-aggregated team health
CREATE TABLE IF NOT EXISTS "TeamStatusSnapshot" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "periodStart" TIMESTAMP NOT NULL,
    "periodEnd" TIMESTAMP NOT NULL,
    "engagementScore" DOUBLE PRECISION,
    "stressIndex" DOUBLE PRECISION,
    "riskLevel" TEXT,
    "participationRate" DOUBLE PRECISION,
    "coachUsageScore" DOUBLE PRECISION,
    "academyCompletionRate" DOUBLE PRECISION,
    "trendLabel" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "TeamStatusSnapshot_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamStatusSnapshot_team_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TeamStatusSnapshot_org_idx" ON "TeamStatusSnapshot"("organizationId");
CREATE INDEX IF NOT EXISTS "TeamStatusSnapshot_team_idx" ON "TeamStatusSnapshot"("teamId");
CREATE INDEX IF NOT EXISTS "TeamStatusSnapshot_period_idx" ON "TeamStatusSnapshot"("periodStart");

-- LearningCohort now links to organization
ALTER TABLE "LearningCohort" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "LearningCohort" ADD CONSTRAINT "LearningCohort_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add missing indexes for SurveyEngagementSnapshot relations if tables already exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'SurveyEngagementSnapshot') THEN
        ALTER TABLE "SurveyEngagementSnapshot" ALTER COLUMN "organizationId" DROP NOT NULL;
    END IF;
END $$;
