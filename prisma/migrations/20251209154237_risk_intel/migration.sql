-- AlterTable
ALTER TABLE "SurveyTemplate" ADD COLUMN     "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentTemplateId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "TeamRiskSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "surveyId" TEXT,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "stressLevel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "drivers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamRiskSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgRiskSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "stressLevel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "drivers" JSONB,
    "surveyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgRiskSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "teamId" TEXT,
    "metric" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "baselineWindowStart" TIMESTAMP(3) NOT NULL,
    "baselineWindowEnd" TIMESTAMP(3) NOT NULL,
    "changeDirection" TEXT NOT NULL,
    "changeMagnitude" DOUBLE PRECISION NOT NULL,
    "statisticalScore" DOUBLE PRECISION,
    "severity" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "triggerTags" TEXT[],
    "audience" TEXT NOT NULL,
    "suggestedActions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NudgeRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "audienceRole" TEXT NOT NULL,
    "channels" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NudgeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NudgeEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NudgeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL,
    "organizationId" TEXT,
    "variants" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "targetMetric" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentAssignment" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScaleCalibration" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "normSampleSize" INTEGER NOT NULL,
    "normMean" DOUBLE PRECISION NOT NULL,
    "normStdDev" DOUBLE PRECISION NOT NULL,
    "percentileMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScaleCalibration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SurveyTemplate" ADD CONSTRAINT "SurveyTemplate_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "SurveyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRiskSnapshot" ADD CONSTRAINT "TeamRiskSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRiskSnapshot" ADD CONSTRAINT "TeamRiskSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRiskSnapshot" ADD CONSTRAINT "TeamRiskSnapshot_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgRiskSnapshot" ADD CONSTRAINT "OrgRiskSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgRiskSnapshot" ADD CONSTRAINT "OrgRiskSnapshot_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyEvent" ADD CONSTRAINT "AnomalyEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyEvent" ADD CONSTRAINT "AnomalyEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationTemplate" ADD CONSTRAINT "RecommendationTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NudgeRule" ADD CONSTRAINT "NudgeRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NudgeEvent" ADD CONSTRAINT "NudgeEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NudgeEvent" ADD CONSTRAINT "NudgeEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NudgeRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NudgeEvent" ADD CONSTRAINT "NudgeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScaleCalibration" ADD CONSTRAINT "ScaleCalibration_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SurveyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
