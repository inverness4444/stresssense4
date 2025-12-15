import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { ensureDefaultSurveyTemplate } from "./surveySeed";
import { createNotification } from "./notifications";
import { logAuditEvent } from "./audit";

type Frequency = "WEEKLY" | "MONTHLY" | "QUARTERLY";

export function nextRunDate(schedule: { frequency: string; dayOfWeek: number | null; dayOfMonth: number | null; startsOn: Date | null }, now = new Date()) {
  const start = schedule.startsOn ?? now;
  const base = new Date(now);
  if (schedule.frequency === "WEEKLY") {
    const dow = schedule.dayOfWeek ?? 1;
    const current = base.getDay();
    const diff = (dow + 7 - current) % 7 || 7;
    base.setDate(base.getDate() + diff);
    return base < start ? start : base;
  }
  if (schedule.frequency === "MONTHLY") {
    const day = schedule.dayOfMonth ?? 1;
    const candidate = new Date(base.getFullYear(), base.getMonth(), day);
    if (candidate <= base) {
      candidate.setMonth(candidate.getMonth() + 1);
    }
    return candidate < start ? start : candidate;
  }
  if (schedule.frequency === "QUARTERLY") {
    const day = schedule.dayOfMonth ?? 1;
    const candidate = new Date(base.getFullYear(), base.getMonth(), day);
    while (candidate <= base) {
      candidate.setMonth(candidate.getMonth() + 3);
    }
    return candidate < start ? start : candidate;
  }
  return start;
}

export function shouldRunSchedule({
  schedule,
  lastSurveyDate,
  now = new Date(),
}: {
  schedule: { frequency: string; dayOfWeek: number | null; dayOfMonth: number | null; startsOn: Date | null };
  lastSurveyDate: Date | null;
  now?: Date;
}) {
  if (schedule.startsOn && now < schedule.startsOn) return false;
  if (!lastSurveyDate) return true;

  const frequency = (schedule.frequency as Frequency) || "WEEKLY";
  const diffMs = now.getTime() - lastSurveyDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (frequency === "WEEKLY") {
    if (schedule.dayOfWeek != null && now.getDay() !== schedule.dayOfWeek) return false;
    return diffDays >= 6.5;
  }
  if (frequency === "MONTHLY") {
    const day = schedule.dayOfMonth ?? 1;
    if (now.getDate() !== day) return false;
    const monthsDiff = now.getMonth() - lastSurveyDate.getMonth() + 12 * (now.getFullYear() - lastSurveyDate.getFullYear());
    return monthsDiff >= 1;
  }
  if (frequency === "QUARTERLY") {
    const day = schedule.dayOfMonth ?? 1;
    if (now.getDate() !== day) return false;
    const monthsDiff = now.getMonth() - lastSurveyDate.getMonth() + 12 * (now.getFullYear() - lastSurveyDate.getFullYear());
    return monthsDiff >= 3;
  }
  return false;
}

export async function runSurveySchedules(now = new Date()) {
  const schedules = await prisma.surveySchedule.findMany({
    where: { isActive: true },
    include: { targets: true, organization: { include: { settings: true } } },
  });

  for (const schedule of schedules) {
    const template =
      (await prisma.surveyTemplate.findUnique({ where: { id: schedule.templateId }, include: { questions: true } })) ||
      (await ensureDefaultSurveyTemplate());
    const lastSurvey = await prisma.survey.findFirst({
      where: { scheduleId: schedule.id },
      orderBy: { createdAt: "desc" },
    });

    const shouldRun = shouldRunSchedule({
      schedule: { ...schedule, startsOn: schedule.startsOn ?? null },
      lastSurveyDate: lastSurvey?.createdAt ?? null,
      now,
    });
    if (!shouldRun) continue;

    const teams = schedule.targets.map((t: any) => t.teamId);
    const userIds = await prisma.userTeam.findMany({
      where: { teamId: { in: teams } },
      select: { userId: true },
    });
    const uniqueUserIds = Array.from(new Set(userIds.map((u: any) => u.userId)));

    const survey = await prisma.survey.create({
      data: {
        organizationId: schedule.organizationId,
        templateId: template.id,
        createdById: schedule.createdById,
        name: schedule.name,
        description: schedule.description,
        status: "ACTIVE",
        startsAt: now,
        minResponsesForBreakdown: schedule.minResponsesForBreakdown ?? schedule.organization.settings?.minResponsesForBreakdown ?? 4,
        scheduleId: schedule.id,
        questions: {
          create: template.questions.map((q: any) => ({
            order: q.order,
            text: q.text,
            type: q.type,
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
          })),
        },
        targets: { create: teams.map((teamId: any) => ({ teamId })) },
      },
    });

    await prisma.surveyInviteToken.createMany({
      data: uniqueUserIds.map((uid) => ({
        surveyId: survey.id,
        userId: uid,
        token: randomBytes(24).toString("hex"),
      })),
    });

    await createNotification({
      organizationId: schedule.organizationId,
      title: "New stress pulse launched",
      type: "SURVEY_CREATED",
      body: `${schedule.name} is now live`,
      link: `/app/surveys/${survey.id}`,
    });

    await logAuditEvent({
      organizationId: schedule.organizationId,
      userId: schedule.createdById,
      action: "SURVEY_CREATED_FROM_SCHEDULE",
      targetType: "SURVEY",
      targetId: survey.id,
      metadata: { scheduleId: schedule.id, name: schedule.name },
    });
  }
}
