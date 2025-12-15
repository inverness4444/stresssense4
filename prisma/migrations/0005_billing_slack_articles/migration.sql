-- Plans
CREATE TABLE "Plan" (
    "id" TEXT PRIMARY KEY,
    "stripePriceId" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPriceCents" INTEGER NOT NULL,
    "maxEmployees" INTEGER,
    "maxActiveSurveys" INTEGER,
    "maxTeams" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Subscription
CREATE TABLE "Subscription" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL UNIQUE,
    "planId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- SlackIntegration
CREATE TABLE "SlackIntegration" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL UNIQUE,
    "accessToken" TEXT NOT NULL,
    "botUserId" TEXT,
    "teamId" TEXT,
    "teamName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SlackIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Article
CREATE TABLE "Article" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT FALSE,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add slack fields
ALTER TABLE "OrganizationSettings" ADD COLUMN IF NOT EXISTS "slackEnabled" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "OrganizationSettings" ADD COLUMN IF NOT EXISTS "slackAlertsChannelId" TEXT;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "slackUserId" TEXT;
