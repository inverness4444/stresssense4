-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "brandingFaviconUrl" TEXT,
ADD COLUMN     "brandingLogoUrl" TEXT,
ADD COLUMN     "brandingPrimaryColor" TEXT,
ADD COLUMN     "brandingSecondaryColor" TEXT,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "subdomain" TEXT,
ADD COLUMN     "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "loginBackgroundUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationBrand" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrganizationBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contactEmail" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerUser" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerOrganization" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceApp" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "listingType" TEXT NOT NULL,
    "listedByPartnerId" TEXT,
    "iconUrl" TEXT,
    "configSchema" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceInstallation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "installedById" TEXT NOT NULL,
    "config" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationWorkflow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "triggerEvent" TEXT,
    "scheduleCron" TEXT,
    "definition" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "input" JSONB,
    "logs" JSONB,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSpace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerType" TEXT NOT NULL,
    "ownerOrgId" TEXT,
    "ownerPartnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMembership" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "orgUserId" TEXT,
    "partnerUserId" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceApp_slug_key" ON "MarketplaceApp"("slug");

-- AddForeignKey
ALTER TABLE "OrganizationBrand" ADD CONSTRAINT "OrganizationBrand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBrand" ADD CONSTRAINT "OrganizationBrand_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerUser" ADD CONSTRAINT "PartnerUser_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerOrganization" ADD CONSTRAINT "PartnerOrganization_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerOrganization" ADD CONSTRAINT "PartnerOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceApp" ADD CONSTRAINT "MarketplaceApp_listedByPartnerId_fkey" FOREIGN KEY ("listedByPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInstallation" ADD CONSTRAINT "MarketplaceInstallation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInstallation" ADD CONSTRAINT "MarketplaceInstallation_appId_fkey" FOREIGN KEY ("appId") REFERENCES "MarketplaceApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInstallation" ADD CONSTRAINT "MarketplaceInstallation_installedById_fkey" FOREIGN KEY ("installedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkflow" ADD CONSTRAINT "AutomationWorkflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkflow" ADD CONSTRAINT "AutomationWorkflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSpace" ADD CONSTRAINT "ProjectSpace_ownerOrgId_fkey" FOREIGN KEY ("ownerOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSpace" ADD CONSTRAINT "ProjectSpace_ownerPartnerId_fkey" FOREIGN KEY ("ownerPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
