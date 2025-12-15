import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";
import { createNotification } from "@/lib/notifications";
import { sendSurveyInviteEmail } from "@/lib/email";
import { sendSlackDM } from "@/lib/slack";

type SendNudgePayload = {
  ruleId: string;
  userId: string;
  organizationId: string;
  channel: string;
  message: string;
  link?: string;
};

export async function scheduleNudgesForSurveyClose(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { organization: true, targets: true },
  });
  if (!survey) return;
  const rules = await prisma.nudgeRule.findMany({
    where: {
      isActive: true,
      triggerType: "AFTER_SURVEY_CLOSE",
      OR: [{ organizationId: survey.organizationId }, { organizationId: null }],
    },
  });
  if (!rules.length) return;

  const managerIds = await prisma.userTeam
    .findMany({
      where: { teamId: { in: survey.targets.map((t: any) => t.teamId) } },
      select: { userId: true },
    })
    .then((rows: any[]) => rows.map((r: any) => r.userId));

  const recipients = await prisma.user.findMany({
    where: {
      organizationId: survey.organizationId,
      id: { in: managerIds.length ? managerIds : undefined },
      role: { in: ["MANAGER", "ADMIN"] },
    },
  });

  for (const rule of rules) {
    for (const user of recipients) {
      for (const channel of rule.channels) {
        await addJob("sendNudge", {
          ruleId: rule.id,
          userId: user.id,
          organizationId: survey.organizationId,
          channel,
          message: `Survey ${survey.name} has closed. Review results and plan follow-ups.`,
          link: `/app/surveys/${survey.id}`,
        });
      }
    }
  }
}

export async function sendNudgeNow(payload: SendNudgePayload) {
  const { ruleId, userId, organizationId, channel, message, link } = payload;
  await prisma.nudgeEvent.create({
    data: {
      ruleId,
      userId,
      organizationId,
      channel,
      payload: { message, link },
      status: "sent",
    },
  });

  if (channel === "in_app") {
    await createNotification({
      organizationId,
      userId,
      title: "Follow up on stress pulse",
      body: message,
      link,
      type: "NUDGE",
    });
  } else if (channel === "email") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      await sendSurveyInviteEmail({
        to: user.email,
        orgName: "StressSense",
        surveyName: "Follow-up",
        surveyUrl: link ?? "https://stresssense.app",
      });
    }
  } else if (channel === "slack") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.slackUserId) {
      await sendSlackDM({ accessToken: "", slackUserId: user.slackUserId, text: `${message} ${link ?? ""}` });
    }
  }
}
