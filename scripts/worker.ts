import "dotenv/config";
import { processJobsOnce } from "@/lib/queue";
import { sendSurveyInviteEmail } from "@/lib/email";
import { sendSlackDM } from "@/lib/slack";
import { runSurveySchedules } from "@/lib/surveySchedules";
import { exportAllEntities } from "@/lib/dwhExport";
import { processPendingWebhooks } from "@/lib/webhooks";
import { generateSurveyInsight } from "@/lib/surveyInsights";
import { computeRiskSnapshotsForOrg } from "@/lib/riskEngine";
import { detectAndStoreAnomalies } from "@/lib/anomalyEngine";
import { sendNudgeNow } from "@/lib/nudges";
import { recordLifecycleEvent, syncOrgToCRM } from "@/lib/crmSync";
import { markPaymentFailed } from "@/lib/dunning";

async function loop() {
  await processJobsOnce({
    sendEmails: async (payload) => {
      for (const p of payload.items ?? []) {
        await sendSurveyInviteEmail(p);
      }
    },
    sendSlack: async (payload) => {
      await sendSlackDM(payload as any);
    },
    runSurveySchedules: async () => {
      await runSurveySchedules();
    },
    exportDWH: async () => {
      await exportAllEntities();
    },
    webhookDelivery: async () => {
      await processPendingWebhooks();
    },
    generateSurveyInsight: async (payload) => {
      await generateSurveyInsight(payload.surveyId, { force: true });
    },
    playbookTrigger: async () => {
      // placeholder; playbooks run inline when survey closes
    },
    computeRiskSnapshots: async (payload) => {
      await computeRiskSnapshotsForOrg(payload.organizationId, payload.surveyId);
    },
    detectAnomalies: async (payload) => {
      await detectAndStoreAnomalies(payload.organizationId, payload.teamIds ?? []);
    },
    sendNudge: async (payload) => {
      await sendNudgeNow(payload as any);
    },
    sendDunningEmail: async (payload) => {
      // placeholder: would call email sender
      await markPaymentFailed(payload.organizationId);
    },
    trialEndingReminder: async (payload) => {
      await recordLifecycleEvent(payload.organizationId, "TRIAL_ENDING", payload);
    },
    crmSyncEvent: async (payload) => {
      await syncOrgToCRM(payload.organizationId);
    },
    npsPrompt: async () => {
      // placeholder for in-app prompts
    },
  });
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
