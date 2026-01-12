"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSurveyTemplate } from "@/lib/surveySeed";
import { createNotification } from "@/lib/notifications";

type CreateSurveyInput = {
  name: string;
  description?: string;
  teamIds: string[];
  startNow?: boolean;
  startsAt?: string;
  endsAt?: string;
  minResponsesForBreakdown?: number;
};

export async function createSurvey(input: CreateSurveyInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  const role = (user.role ?? "").toUpperCase();
  if (!["HR", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(role)) return { error: "Forbidden" };

  const template = await ensureDefaultSurveyTemplate();
  if (!template) return { error: "No survey templates available" };

  const launchedAt =
    input.startNow || !input.startsAt ? new Date() : new Date(input.startsAt);

  const teamsToTarget = input.teamIds.length ? input.teamIds : [null];

  await Promise.all(
    teamsToTarget.map((teamId) =>
      prisma.surveyRun.create({
        data: {
          orgId: user.organizationId,
          teamId: teamId ?? null,
          templateId: template.id,
          title: input.name || template.name,
          launchedByUserId: user.id,
          launchedAt,
          targetCount: 0,
          completedCount: 0,
          avgStressIndex: null,
          avgEngagementScore: null,
          tags: [],
        },
      })
    )
  );

  const surveyLabel = input.name?.trim() || template.name || "Stress survey";
  const targetUserIds = new Set<string>();
  if (input.teamIds.length) {
    const teamUsers = await prisma.userTeam.findMany({
      where: { teamId: { in: input.teamIds } },
      select: { userId: true },
    });
    teamUsers.forEach((u: any) => targetUserIds.add(u.userId));
  } else {
    const orgUsers = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true },
    });
    orgUsers.forEach((u: any) => targetUserIds.add(u.id));
  }
  const notificationBody = `"${surveyLabel}" is now open.`;
  await Promise.all(
    Array.from(targetUserIds).map((userId) =>
      createNotification({
        organizationId: user.organizationId,
        userId,
        type: "SURVEY_OPENED",
        title: "New stress survey is open",
        body: notificationBody,
        link: "/app/my/stress-survey",
      })
    )
  );

  revalidatePath("/app/surveys");
  return { success: true };
}

export async function closeSurvey(_id?: string) {
  return { error: "Not implemented" };
}

export async function sendInvites(_id?: string) {
  return { error: "Not implemented" };
}

export async function sendSlackInvites(_id?: string) {
  return { error: "Not implemented" };
}

export async function sendEmailReminders(_id?: string) {
  return { error: "Not implemented" };
}

export async function sendSlackReminders(_id?: string) {
  return { error: "Not implemented" };
}

export async function sendSlackThankYou(_id?: string) {
  return { error: "Not implemented" };
}

// Legacy no-op handlers for kiosk mode to avoid build/runtime errors while kiosk is disabled.
export async function createKioskSession() {
  return { error: "Kiosk mode disabled" };
}

export async function deactivateKioskSession() {
  return { error: "Kiosk mode disabled" };
}

export async function sendReminders(_id?: string) {
  return { error: "Not implemented" };
}
