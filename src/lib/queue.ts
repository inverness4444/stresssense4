import { env } from "@/config/env";

type JobType =
  | "sendEmails"
  | "sendSlack"
  | "runSurveySchedules"
  | "exportDWH"
  | "webhookDelivery"
  | "playbookTrigger"
  | "generateSurveyInsight"
  | "computeRiskSnapshots"
  | "detectAnomalies"
  | "sendNudge"
  | "sendDunningEmail"
  | "trialEndingReminder"
  | "crmSyncEvent"
  | "npsPrompt"
  | "safetyNotifyHR"
  | "computeEngagementSnapshots"
  | "ai_eval_coach_message"
  | "buildPersonalStatusSnapshots"
  | "scheduleOneOnOnesAndGoals"
  | "syncOneOnOnesWithCalendar"
  | "prepareCompensationCycleData"
  | "notifyCompDeadlines"
  | "buildOnboardingJourneysForNewHires"
  | "sendOnboardingNudges"
  | "dsr_export"
  | "dsr_erasure";

type JobPayload = Record<string, any>;

type Job = { type: JobType; payload: JobPayload };

// Placeholder in-memory queue for MVP. Swap with BullMQ/Redis in production.
const queue: Job[] = [];

export async function addJob(type: JobType, payload: JobPayload) {
  queue.push({ type, payload });
}

export function getQueueSnapshot() {
  return { length: queue.length };
}

export async function processJobsOnce(handlerMap: Partial<Record<JobType, (payload: JobPayload) => Promise<void>>>) {
  while (queue.length) {
    const job = queue.shift()!;
    const handler = handlerMap[job.type];
    if (handler) {
      try {
        await handler(job.payload);
      } catch (e) {
        console.error("Job failed", job.type, e);
      }
    }
  }
}

// default handler map for simple environments
export async function processJobsDefault() {
  const { buildPersonalStatusSnapshots } = await import("@/lib/jobs/buildPersonalStatusSnapshots");
  const { scheduleOneOnOnesAndGoals } = await import("@/lib/jobs/scheduleOneOnOnesAndGoals");
  const { syncOneOnOnesWithCalendar } = await import("@/lib/jobs/syncOneOnOnesWithCalendar");
  const { prepareCompensationCycleData } = await import("@/lib/jobs/prepareCompensationCycleData");
  const { notifyCompDeadlines } = await import("@/lib/jobs/notifyCompDeadlines");
  const { buildOnboardingJourneysForNewHires } = await import("@/lib/jobs/buildOnboardingJourneysForNewHires");
  const { sendOnboardingNudges } = await import("@/lib/jobs/sendOnboardingNudges");
  await processJobsOnce({
    buildPersonalStatusSnapshots,
    scheduleOneOnOnesAndGoals,
    syncOneOnOnesWithCalendar,
    prepareCompensationCycleData,
    notifyCompDeadlines,
    buildOnboardingJourneysForNewHires,
    sendOnboardingNudges,
  });
}
