'use server';

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSurveyTemplate } from "@/lib/surveySeed";
import { sendSurveyInviteEmail, sendSurveyReminderEmail, isEmailConfigured } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { getBaseUrl } from "@/lib/url";
import { logAuditEvent } from "@/lib/audit";
import { getOrgSubscription, checkLimit } from "@/lib/subscription";
import { sendSlackDM, postSlackMessageToChannel } from "@/lib/slack";
import { triggerWebhookEvent } from "@/lib/webhooks";
import { ensureKioskUser } from "@/lib/kiosk";
import { trackProductEvent } from "@/lib/analytics";
import { addJob } from "@/lib/queue";
import { scheduleNudgesForSurveyClose } from "@/lib/nudges";
import { detectAndStoreAnomalies } from "@/lib/anomalyEngine";
import { computeRiskSnapshotsForOrg } from "@/lib/riskEngine";

type CreateSurveyInput = {
  name: string;
  description?: string;
  teamIds: string[];
  startNow: boolean;
  startsAt?: string;
  endsAt?: string;
  minResponsesForBreakdown: number;
};

export async function createSurvey(input: CreateSurveyInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "You don't have access." };

  const template = await ensureDefaultSurveyTemplate();
  const teams = await prisma.team.findMany({
    where: { id: { in: input.teamIds }, organizationId: user.organizationId },
  });
  const status = input.startNow ? "ACTIVE" : "DRAFT";
  const sub = await getOrgSubscription(user.organizationId);
  const activeCount = await prisma.survey.count({ where: { organizationId: user.organizationId, status: "ACTIVE" } });
  if (status === "ACTIVE" && !checkLimit(activeCount, sub?.plan?.maxActiveSurveys ?? null)) {
    return { error: "You’ve reached the limit of active stress pulses on your current plan. Upgrade to add more." };
  }

  const startDate = input.startNow ? new Date() : input.startsAt ? new Date(input.startsAt) : null;
  const endDate = input.endsAt ? new Date(input.endsAt) : null;

  const survey = await prisma.survey.create({
    data: {
      organizationId: user.organizationId,
      templateId: template.id,
      createdById: user.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status,
      startsAt: startDate,
      endsAt: endDate,
      minResponsesForBreakdown: input.minResponsesForBreakdown || 4,
      questions: {
        create: template.questions.map((q) => ({
          order: q.order,
          text: q.text,
          type: q.type,
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
        })),
      },
      targets: {
        create: teams.map((t) => ({ teamId: t.id })),
      },
    },
    include: { targets: true },
  });

  const userIds = await prisma.userTeam.findMany({
    where: { teamId: { in: teams.map((t) => t.id) } },
    select: { userId: true },
  });
  const uniqueUserIds = Array.from(new Set(userIds.map((u) => u.userId)));

  await prisma.surveyInviteToken.createMany({
    data: uniqueUserIds.map((uid) => ({
      surveyId: survey.id,
      userId: uid,
      token: randomBytes(24).toString("hex"),
    })),
  });

  revalidatePath("/app/surveys");
  await createNotification({
    organizationId: user.organizationId,
    title: "New stress pulse created",
    type: "SURVEY_CREATED",
    body: `${survey.name} is ready`,
    link: `/app/surveys/${survey.id}`,
  });
  await trackProductEvent({ eventName: "survey_created", source: "web_app", properties: { surveyId: survey.id, name: survey.name } });
  await triggerWebhookEvent(user.organizationId, "survey.created", {
    id: survey.id,
    name: survey.name,
    status: survey.status,
    startsAt: survey.startsAt,
  });
  await logAuditEvent({
    organizationId: user.organizationId,
    userId: user.id,
    action: "SURVEY_CREATED",
    targetType: "SURVEY",
    targetId: survey.id,
    metadata: { name: survey.name },
  });
  await trackProductEvent({ eventName: "survey_created", source: "web_app", properties: { surveyId: survey.id, name: survey.name } });
  return { success: true, surveyId: survey.id };
}

export async function closeSurvey(surveyId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "You don't have access." };

  await prisma.survey.update({
    where: { id: surveyId, organizationId: user.organizationId },
    data: { status: "CLOSED", endsAt: new Date() },
  });

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      organization: { include: { settings: true } },
      responses: {
        include: {
          answers: true,
          inviteToken: { include: { user: { include: { teams: { include: { team: true } } } } } },
        },
      },
      questions: true,
      targets: { include: { team: true } },
    },
  });

  if (survey) {
    const settings = survey.organization.settings;
    const minBreakdown = survey.minResponsesForBreakdown ?? settings?.minResponsesForBreakdown ?? 4;
    const scaleMin = settings?.stressScaleMin ?? 1;
    const scaleMax = settings?.stressScaleMax ?? 5;
    const highStressTeams: string[] = [];

    survey.targets.forEach((t) => {
      const teamResponses = survey.responses.filter((r) => r.inviteToken.user.teams.some((ut) => ut.teamId === t.teamId));
      if (teamResponses.length < minBreakdown) return;
      let sum = 0;
      let count = 0;
      survey.questions
        .filter((q) => q.type === "SCALE")
        .forEach((q) => {
          teamResponses.forEach((r) => {
            const ans = r.answers.find((a) => a.questionId === q.id);
            if (ans?.scaleValue != null) {
              sum += ans.scaleValue;
              count += 1;
            }
          });
        });
      if (!count) return;
      const avg = sum / count;
      const index = Math.max(0, Math.min(100, Math.round(((avg - scaleMin) / (scaleMax - scaleMin)) * 100)));
      if (index >= 70) {
        highStressTeams.push(t.team.name);
      }
    });

    await createNotification({
      organizationId: user.organizationId,
      title: "Survey closed",
      type: "SURVEY_CLOSED",
      body: "Survey was closed and no new answers will be accepted.",
      link: `/app/surveys/${surveyId}`,
    });
    await trackProductEvent({ eventName: "survey_closed", source: "web_app", properties: { surveyId } });

    if (highStressTeams.length) {
      await createNotification({
        organizationId: user.organizationId,
        title: "High stress spotted",
        type: "HIGH_STRESS_TEAM",
        body: `High stress levels in ${highStressTeams.slice(0, 3).join(", ")}.`,
        link: `/app/surveys/${surveyId}`,
      });
      const integration = await prisma.slackIntegration.findUnique({ where: { organizationId: user.organizationId } });
      const orgSettings = await prisma.organizationSettings.findUnique({ where: { organizationId: user.organizationId } });
      if (integration && orgSettings?.slackAlertsChannelId) {
        await postSlackMessageToChannel({
          accessToken: integration.accessToken,
          channelId: orgSettings.slackAlertsChannelId,
          text: `High stress detected in ${highStressTeams.length} teams for "${survey?.name}". View details: ${getBaseUrl()}/app/surveys/${surveyId}`,
        }).catch((err) => console.error("Slack alert failed", err));
      }
    }
  }
  await triggerWebhookEvent(user.organizationId, "survey.closed", {
    id: surveyId,
    closedAt: new Date().toISOString(),
  });
  // Kick off risk/anomaly/nudge follow-ups asynchronously
  await addJob("computeRiskSnapshots", { organizationId: user.organizationId, surveyId });
  const teamIds = survey?.targets.map((t) => t.teamId) ?? [];
  await addJob("detectAnomalies", { organizationId: user.organizationId, teamIds });
  await scheduleNudgesForSurveyClose(surveyId);
  await logAuditEvent({
    organizationId: user.organizationId,
    userId: user.id,
    action: "SURVEY_CLOSED",
    targetType: "SURVEY",
    targetId: surveyId,
  });
  await trackProductEvent({ eventName: "survey_closed", source: "web_app", properties: { surveyId } });
  revalidatePath(`/app/surveys/${surveyId}`);
  revalidatePath("/app/surveys");
  return { success: true };
}

export async function createKioskSession(surveyId: string, name?: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "You don't have access." };
  const survey = await prisma.survey.findFirst({ where: { id: surveyId, organizationId: user.organizationId } });
  if (!survey) return { error: "Survey not found." };
  const kiosk = await prisma.kioskSession.create({
    data: {
      surveyId,
      organizationId: user.organizationId,
      name: name?.trim() || null,
      createdById: user.id,
    },
  });
  await ensureKioskUser(user.organizationId);
  await trackProductEvent({ eventName: "kiosk_created", source: "web_app", properties: { surveyId, kioskId: kiosk.id } });
  return { success: true, kioskId: kiosk.id };
}

export async function deactivateKioskSession(kioskId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "You don't have access." };
  await prisma.kioskSession.updateMany({
    where: { id: kioskId, organizationId: user.organizationId },
    data: { isActive: false },
  });
  return { success: true };
}

export async function sendInvites(surveyId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "You don't have access." };

  if (!isEmailConfigured()) {
    return { error: "Email transport is not configured." };
  }

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, organizationId: user.organizationId },
    include: { inviteTokens: { include: { user: true } }, organization: true },
  });
  if (!survey) return { error: "Survey not found." };

  const pending = survey.inviteTokens.filter((t) => !t.usedAt && t.user.email);

  // Simple A/B variant assignment
  const variants = ["A", "B"];
  pending.forEach((inv, idx) => {
    if (!inv.variantKey) {
      inv.variantKey = variants[idx % variants.length];
    }
  });

  await Promise.all(
    pending.map((invite) =>
      sendSurveyInviteEmail({
        to: invite.user.email,
        orgName: survey.organization.name,
        surveyName: survey.name,
        surveyUrl: `${getBaseUrl()}/s/${invite.token}`,
        variantKey: invite.variantKey ?? undefined,
      }).catch((err) => {
        console.error("Invite email failed", err);
      })
    )
  );

  await prisma.survey.update({
    where: { id: survey.id },
    data: { invitesSentAt: new Date() },
  });
  await trackProductEvent({ eventName: "invites_sent", source: "web_app", properties: { surveyId: survey.id, count: pending.length } });

  revalidatePath(`/app/surveys/${survey.id}`);
  return { success: true, sent: pending.length };
}

export async function sendReminders(surveyId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "You don't have access." };

  if (!isEmailConfigured()) {
    return { error: "Email transport is not configured." };
  }

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, organizationId: user.organizationId },
    include: { inviteTokens: { include: { user: true } }, organization: true },
  });
  if (!survey) return { error: "Survey not found." };

  const pending = survey.inviteTokens.filter((t) => !t.usedAt && t.user.email);

  await Promise.all(
    pending.map((invite) =>
      sendSurveyReminderEmail({
        to: invite.user.email,
        orgName: survey.organization.name,
        surveyName: survey.name,
        surveyUrl: `${getBaseUrl()}/s/${invite.token}`,
      }).catch((err) => console.error("Reminder email failed", err))
    )
  );

  await prisma.survey.update({
    where: { id: survey.id },
    data: { remindersSentAt: new Date() },
  });
  await trackProductEvent({ eventName: "reminders_sent", source: "web_app", properties: { surveyId: survey.id, count: pending.length } });

  revalidatePath(`/app/surveys/${survey.id}`);
  return { success: true, sent: pending.length };
}

export async function sendSlackInvites(surveyId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "You don't have access." };
  const integration = await prisma.slackIntegration.findUnique({ where: { organizationId: user.organizationId } });
  if (!integration) return { error: "Slack не подключён" };
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, organizationId: user.organizationId },
    include: { inviteTokens: { include: { user: true } } },
  });
  if (!survey) return { error: "Survey not found." };
  const pending = survey.inviteTokens.filter((t) => !t.usedAt && t.user.slackUserId);
  await Promise.all(
    pending.map((invite) =>
      sendSlackDM({
        accessToken: integration.accessToken,
        slackUserId: invite.user.slackUserId!,
        text: `Стресс-пульс "${survey.name}" готов. Поделитесь, как вы себя чувствуете: ${getBaseUrl()}/s/${invite.token}`,
      }).catch((err) => console.error("Slack DM failed", err))
    )
  );
  await trackProductEvent({ eventName: "slack_invites_sent", source: "web_app", properties: { surveyId: survey.id, count: pending.length } });
  return { success: true, sent: pending.length };
}
