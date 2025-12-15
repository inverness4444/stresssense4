-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "managerId" TEXT;

-- CreateTable
CREATE TABLE "EmployeeAttributeDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAttributeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAttributeValue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SSOConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "issuer" TEXT,
    "ssoUrl" TEXT,
    "certificate" TEXT,
    "oidcClientId" TEXT,
    "oidcClientSecret" TEXT,
    "oidcTokenUrl" TEXT,
    "oidcUserInfoUrl" TEXT,
    "oidcScope" TEXT,
    "emailClaim" TEXT,
    "nameClaim" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SSOConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRISIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiBaseUrl" TEXT,
    "apiKey" TEXT,
    "subdomain" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HRISIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAttributeValue_userId_attributeId_key" ON "EmployeeAttributeValue"("userId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "SSOConfig_organizationId_key" ON "SSOConfig"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "HRISIntegration_organizationId_key" ON "HRISIntegration"("organizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAttributeDefinition" ADD CONSTRAINT "EmployeeAttributeDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAttributeValue" ADD CONSTRAINT "EmployeeAttributeValue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAttributeValue" ADD CONSTRAINT "EmployeeAttributeValue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAttributeValue" ADD CONSTRAINT "EmployeeAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "EmployeeAttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SSOConfig" ADD CONSTRAINT "SSOConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRISIntegration" ADD CONSTRAINT "HRISIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
