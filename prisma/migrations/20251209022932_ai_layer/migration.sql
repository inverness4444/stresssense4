-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "defaultLanguage" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "language" TEXT DEFAULT 'en';

-- AlterTable
ALTER TABLE "SurveyTemplate" ADD COLUMN     "defaultLanguage" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredLanguage" TEXT;

-- CreateTable
CREATE TABLE "SurveyInsight" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "language" TEXT,
    "summaryText" TEXT NOT NULL,
    "managerSuggestions" TEXT,
    "sentimentLabel" TEXT,
    "themes" JSONB,
    "lastGeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyInsight_surveyId_key" ON "SurveyInsight"("surveyId");

-- AddForeignKey
ALTER TABLE "SurveyInsight" ADD CONSTRAINT "SurveyInsight_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
