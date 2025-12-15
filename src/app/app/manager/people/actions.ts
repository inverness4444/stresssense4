"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { revalidatePath } from "next/cache";

function ensurePeopleAccess(user: { role: string; organizationId: string }) {
  if (!["ADMIN", "HR", "MANAGER"].includes(user.role)) throw new Error("Forbidden");
}

export async function createOrUpdateOneOnOneRelationship(input: {
  employeeId: string;
  teamId?: string | null;
  cadenceDays?: number | null;
  templateId?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  ensurePeopleAccess(user);
  const enabled = await isFeatureEnabled("people_module_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) throw new Error("Not available");

  const existing = await prisma.oneOnOneRelationship.findFirst({
    where: { organizationId: user.organizationId, managerId: user.id, employeeId: input.employeeId },
  });
  const cadence = input.cadenceDays ?? existing?.cadenceDays ?? 14;
  const nextPlannedAt = existing?.nextPlannedAt ?? new Date(Date.now() + cadence * 86400000);
  let rel;
  if (existing) {
    rel = await prisma.oneOnOneRelationship.update({
      where: { id: existing.id },
      data: {
        teamId: input.teamId ?? null,
        cadenceDays: cadence,
        templateId: input.templateId ?? null,
        nextPlannedAt,
      },
    });
  } else {
    rel = await prisma.oneOnOneRelationship.create({
      data: {
        organizationId: user.organizationId,
        managerId: user.id,
        employeeId: input.employeeId,
        teamId: input.teamId ?? null,
        cadenceDays: cadence,
        templateId: input.templateId ?? null,
        nextPlannedAt,
      },
    });
  }
  revalidatePath("/app/manager/people");
  return rel;
}

export async function scheduleOneOnOne(input: { relationshipId: string; scheduledAt: Date | string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  ensurePeopleAccess(user);
  const rel = await prisma.oneOnOneRelationship.findUnique({ where: { id: input.relationshipId } });
  if (!rel || rel.organizationId !== user.organizationId || rel.managerId !== user.id) throw new Error("Forbidden");
  const meeting = await prisma.oneOnOneMeeting.create({
    data: {
      organizationId: user.organizationId,
      relationshipId: rel.id,
      scheduledAt: new Date(input.scheduledAt),
      status: "scheduled",
    },
  });
  revalidatePath("/app/manager/people");
  return meeting;
}

export async function updateOneOnOneAgenda(input: { meetingId: string; role: "manager" | "employee"; agenda: any }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const meeting = await prisma.oneOnOneMeeting.findUnique({
    where: { id: input.meetingId },
    include: { relationship: true },
  });
  if (!meeting || meeting.organizationId !== user.organizationId) throw new Error("Not found");
  const isManager = meeting.relationship.managerId === user.id;
  const isEmployee = meeting.relationship.employeeId === user.id;
  if (!isManager && !isEmployee) throw new Error("Forbidden");
  const data =
    input.role === "manager"
      ? { agendaManager: input.agenda }
      : { agendaEmployee: input.agenda };
  const updated = await prisma.oneOnOneMeeting.update({ where: { id: meeting.id }, data });
  revalidatePath("/app/manager/people");
  revalidatePath("/app/my/home");
  return updated;
}

export async function completeOneOnOne(input: { meetingId: string; role: "manager" | "employee"; notes?: any; endedAt?: Date | string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const meeting = await prisma.oneOnOneMeeting.findUnique({
    where: { id: input.meetingId },
    include: { relationship: true },
  });
  if (!meeting || meeting.organizationId !== user.organizationId) throw new Error("Not found");
  const isManager = meeting.relationship.managerId === user.id;
  const isEmployee = meeting.relationship.employeeId === user.id;
  if (!isManager && !isEmployee) throw new Error("Forbidden");
  const data =
    input.role === "manager"
      ? { notesManager: input.notes ?? null, status: "completed", endedAt: input.endedAt ? new Date(input.endedAt) : new Date() }
      : { notesEmployee: input.notes ?? null, status: "completed", endedAt: input.endedAt ? new Date(input.endedAt) : new Date() };
  const updated = await prisma.oneOnOneMeeting.update({ where: { id: meeting.id }, data });
  revalidatePath("/app/manager/people");
  revalidatePath("/app/my/home");
  return updated;
}

export async function createGoal(input: {
  title: string;
  description?: string;
  category?: string;
  alignment?: string;
  startDate?: Date | string | null;
  dueDate?: Date | string | null;
  teamId?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const enabled = await isFeatureEnabled("people_module_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) throw new Error("Not available");
  const goal = await prisma.goal.create({
    data: {
      organizationId: user.organizationId,
      ownerUserId: user.id,
      teamId: input.teamId ?? null,
      title: input.title,
      description: input.description,
      category: input.category,
      alignment: input.alignment,
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
  });
  revalidatePath("/app/my/home");
  revalidatePath("/app/manager/home");
  return goal;
}

export async function updateGoalProgress(input: { goalId: string; value?: number | null; progress?: number | null; comment?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const goal = await prisma.goal.findUnique({ where: { id: input.goalId } });
  if (!goal || goal.organizationId !== user.organizationId) throw new Error("Not found");
  if (goal.ownerUserId !== user.id && !["ADMIN", "HR", "MANAGER"].includes(user.role)) throw new Error("Forbidden");
  await prisma.goalCheckin.create({
    data: {
      goalId: goal.id,
      createdById: user.id,
      value: input.value ?? null,
      progress: input.progress ?? null,
      comment: input.comment ?? null,
    },
  });
  await prisma.goal.update({
    where: { id: goal.id },
    data: {
      currentValue: input.value ?? goal.currentValue,
      progress: input.progress ?? goal.progress,
      updatedAt: new Date(),
    },
  });
  revalidatePath("/app/my/home");
  revalidatePath("/app/manager/home");
  return true;
}

export async function changeGoalStatus(input: { goalId: string; status: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const goal = await prisma.goal.findUnique({ where: { id: input.goalId } });
  if (!goal || goal.organizationId !== user.organizationId) throw new Error("Not found");
  if (goal.ownerUserId !== user.id && !["ADMIN", "HR", "MANAGER"].includes(user.role)) throw new Error("Forbidden");
  await prisma.goal.update({ where: { id: goal.id }, data: { status: input.status } });
  revalidatePath("/app/my/home");
  revalidatePath("/app/manager/home");
  return true;
}

export async function requestFeedback(input: { targetUserId: string; context?: string; question?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const req = await prisma.feedbackRequest.create({
    data: {
      organizationId: user.organizationId,
      requesterId: user.id,
      targetUserId: input.targetUserId,
      context: input.context,
      question: input.question,
    },
  });
  revalidatePath("/app/my/home");
  return req;
}

export async function submitFeedbackResponse(input: { requestId: string; rating?: number | null; comments?: string; isAnonymousToTarget?: boolean }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const req = await prisma.feedbackRequest.findUnique({ where: { id: input.requestId } });
  if (!req || req.organizationId !== user.organizationId) throw new Error("Not found");
  await prisma.feedbackResponse.create({
    data: {
      organizationId: user.organizationId,
      requestId: req.id,
      responderId: user.id,
      rating: input.rating ?? null,
      comments: input.comments ?? null,
      isAnonymousToTarget: input.isAnonymousToTarget ?? false,
    },
  });
  await prisma.feedbackRequest.update({ where: { id: req.id }, data: { status: "completed" } });
  revalidatePath("/app/my/home");
  return true;
}

export async function sendRecognition(input: { toUserId: string; message: string; tags?: string[]; teamId?: string | null; isPublic?: boolean }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const rec = await prisma.recognition.create({
    data: {
      organizationId: user.organizationId,
      fromUserId: user.id,
      toUserId: input.toUserId,
      teamId: input.teamId ?? null,
      message: input.message,
      tags: input.tags ?? [],
      isPublic: input.isPublic ?? true,
    },
  });
  revalidatePath("/app/my/home");
  revalidatePath("/app/manager/home");
  return rec;
}
