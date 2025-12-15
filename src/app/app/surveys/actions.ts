'use server';

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  if (!["HR", "Manager"].includes(user.role)) return { error: "Forbidden" };

  const template = await prisma.surveyTemplate.findFirst({ include: { questions: true } });
  if (!template) return { error: "No survey templates available" };
  const teamId = input.teamIds[0] ?? null;

  await prisma.surveyRun.create({
    data: {
      orgId: user.organizationId,
      teamId,
      templateId: template.id,
      title: input.name || template.title,
      launchedByUserId: user.id,
      targetCount: 0,
      completedCount: 0,
      avgStressIndex: null,
      avgEngagementScore: null,
      tags: [],
    },
  });

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
