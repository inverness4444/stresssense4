-- CreateEnum
CREATE TYPE "QuestionPolarity" AS ENUM ('NEGATIVE', 'POSITIVE');

-- AlterTable
ALTER TABLE "SurveyQuestion"
ADD COLUMN     "driverKey" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "polarity" "QuestionPolarity" NOT NULL DEFAULT 'NEGATIVE',
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiReason" TEXT;
