-- CreateEnum
CREATE TYPE "AnonymousFeedbackStatus" AS ENUM ('new', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "AnonymousFeedbackCategory" AS ENUM ('communication', 'workload', 'process', 'culture', 'conflict', 'ideas');

-- CreateEnum
CREATE TYPE "AnonymousThreadDirection" AS ENUM ('sender_to_leader', 'leader_to_sender');

-- CreateEnum
CREATE TYPE "AbuseReportStatus" AS ENUM ('open', 'reviewed');

-- CreateTable
CREATE TABLE "anonymous_feedback" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "recipient_leader_id" TEXT NOT NULL,
    "team_id" TEXT,
    "category" "AnonymousFeedbackCategory" NOT NULL,
    "tags" JSONB,
    "message" TEXT NOT NULL,
    "allow_followup" BOOLEAN NOT NULL DEFAULT false,
    "status" "AnonymousFeedbackStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymous_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_threads" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "anon_handle" TEXT NOT NULL,
    "rotation_bucket" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymous_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_thread_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "direction" "AnonymousThreadDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymous_thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abuse_reports" (
    "id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "reported_by_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AbuseReportStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anonymous_feedback_org_id_idx" ON "anonymous_feedback"("org_id");

-- CreateIndex
CREATE INDEX "anonymous_feedback_recipient_leader_id_idx" ON "anonymous_feedback"("recipient_leader_id");

-- CreateIndex
CREATE INDEX "anonymous_feedback_team_id_idx" ON "anonymous_feedback"("team_id");

-- CreateIndex
CREATE INDEX "anonymous_feedback_category_idx" ON "anonymous_feedback"("category");

-- CreateIndex
CREATE INDEX "anonymous_feedback_status_idx" ON "anonymous_feedback"("status");

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_threads_feedback_id_key" ON "anonymous_threads"("feedback_id");

-- CreateIndex
CREATE INDEX "anonymous_threads_org_id_idx" ON "anonymous_threads"("org_id");

-- CreateIndex
CREATE INDEX "anonymous_threads_rotation_bucket_idx" ON "anonymous_threads"("rotation_bucket");

-- CreateIndex
CREATE INDEX "anonymous_thread_messages_thread_id_idx" ON "anonymous_thread_messages"("thread_id");

-- CreateIndex
CREATE INDEX "abuse_reports_feedback_id_idx" ON "abuse_reports"("feedback_id");

-- CreateIndex
CREATE INDEX "abuse_reports_reported_by_user_id_idx" ON "abuse_reports"("reported_by_user_id");

-- CreateIndex
CREATE INDEX "abuse_reports_status_idx" ON "abuse_reports"("status");

-- AddForeignKey
ALTER TABLE "anonymous_feedback" ADD CONSTRAINT "anonymous_feedback_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_feedback" ADD CONSTRAINT "anonymous_feedback_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_feedback" ADD CONSTRAINT "anonymous_feedback_recipient_leader_id_fkey" FOREIGN KEY ("recipient_leader_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_feedback" ADD CONSTRAINT "anonymous_feedback_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_threads" ADD CONSTRAINT "anonymous_threads_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_threads" ADD CONSTRAINT "anonymous_threads_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "anonymous_feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_thread_messages" ADD CONSTRAINT "anonymous_thread_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "anonymous_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "anonymous_feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
