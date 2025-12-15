-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "lifecycleStage" TEXT,
ADD COLUMN     "signupSource" TEXT,
ADD COLUMN     "trialConvertedAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "trialStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "baseSeats" INTEGER,
ADD COLUMN     "billingMode" TEXT,
ADD COLUMN     "featureKeys" TEXT[],
ADD COLUMN     "includedAIRequests" INTEGER,
ADD COLUMN     "includedAutomationWorkflows" INTEGER,
ADD COLUMN     "includedMarketplaceApps" INTEGER,
ADD COLUMN     "pricePerSeatCents" INTEGER;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "isTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seats" INTEGER,
ADD COLUMN     "usedSeats" INTEGER;

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPriceCents" INTEGER NOT NULL,
    "featureKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationAddOn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMIntegration" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "apiBaseUrl" TEXT,
    "apiKey" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "authType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRMIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgCRMMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "crmIntegrationId" TEXT NOT NULL,
    "crmAccountId" TEXT,
    "crmOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgCRMMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "number" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DunningState" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'none',
    "lastReminderAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DunningState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralProgram" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rewardType" TEXT NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgReferral" (
    "id" TEXT NOT NULL,
    "referrerOrganizationId" TEXT NOT NULL,
    "referredOrganizationId" TEXT,
    "referralCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "referralProgramId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppSurvey" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerLocation" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InAppSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppSurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "score" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppSurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagOverride" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "environment" TEXT,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AddOn_key_key" ON "AddOn"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DunningState_organizationId_key" ON "DunningState"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralProgram_key_key" ON "ReferralProgram"("key");

-- CreateIndex
CREATE UNIQUE INDEX "OrgReferral_referralCode_key" ON "OrgReferral"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAddOn" ADD CONSTRAINT "OrganizationAddOn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAddOn" ADD CONSTRAINT "OrganizationAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgCRMMapping" ADD CONSTRAINT "OrgCRMMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgCRMMapping" ADD CONSTRAINT "OrgCRMMapping_crmIntegrationId_fkey" FOREIGN KEY ("crmIntegrationId") REFERENCES "CRMIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DunningState" ADD CONSTRAINT "DunningState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgReferral" ADD CONSTRAINT "OrgReferral_referrerOrganizationId_fkey" FOREIGN KEY ("referrerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgReferral" ADD CONSTRAINT "OrgReferral_referredOrganizationId_fkey" FOREIGN KEY ("referredOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgReferral" ADD CONSTRAINT "OrgReferral_referralProgramId_fkey" FOREIGN KEY ("referralProgramId") REFERENCES "ReferralProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppSurveyResponse" ADD CONSTRAINT "InAppSurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "InAppSurvey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppSurveyResponse" ADD CONSTRAINT "InAppSurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppSurveyResponse" ADD CONSTRAINT "InAppSurveyResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "FeatureFlag"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
