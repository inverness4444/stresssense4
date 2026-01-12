'use server';

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSurveyTemplate } from "@/lib/surveySeed";
import { createNotification } from "@/lib/notifications";
import { runSurveySchedules } from "@/lib/surveySchedules";
import { logAuditEvent } from "@/lib/audit";

type CreateScheduleInput = {
  name: string;
  description?: string;
  frequency: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  teamIds: string[];
  startsOn?: string | null;
  minResponsesForBreakdown?: number | null;
};

export async function createSchedule(input: CreateScheduleInput) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return { error: "You don't have access." };

  const template = await ensureDefaultSurveyTemplate();
  const teams = await prisma.team.findMany({
    where: { id: { in: input.teamIds }, organizationId: user.organizationId },
  });
  if (!teams.length) return { error: "Select at least one team." };

  const schedule = await prisma.surveySchedule.create({
    data: {
      organizationId: user.organizationId,
      templateId: template.id,
      createdById: user.id,
      name: input.name.trim() || "Recurring Stress Pulse",
      description: input.description?.trim() || null,
      frequency: input.frequency,
      dayOfWeek: input.frequency === "WEEKLY" ? input.dayOfWeek ?? 1 : null,
      dayOfMonth: input.frequency !== "WEEKLY" ? input.dayOfMonth ?? 1 : null,
      minResponsesForBreakdown: input.minResponsesForBreakdown ?? null,
      startsOn: input.startsOn ? new Date(input.startsOn) : null,
      targets: { create: teams.map((t: any) => ({ teamId: t.id })) },
    },
  });

  await createNotification({
    organizationId: user.organizationId,
    title: "Recurring stress pulse scheduled",
    type: "SCHEDULE_CREATED",
    body: `${schedule.name} will send automatically`,
    link: "/app/schedules",
  });

  await logAuditEvent({
    organizationId: user.organizationId,
    userId: user.id,
    action: "SCHEDULE_CREATED",
    targetType: "SCHEDULE",
    targetId: schedule.id,
    metadata: { name: schedule.name, frequency: schedule.frequency },
  });

  revalidatePath("/app/schedules");
  return { success: true, scheduleId: schedule.id };
}

export async function runSchedulesNow() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return { error: "You don't have access." };
  await runSurveySchedules();
  revalidatePath("/app/schedules");
  return { success: true };
}
