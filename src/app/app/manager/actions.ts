"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/featureFlags";

function assertManagerAccess(user: { id: string; role: string; organizationId: string }) {
  if (user.role !== "MANAGER" && user.role !== "ADMIN" && user.role !== "HR") {
    throw new Error("Forbidden");
  }
}

export async function updateActionCenterItemStatus({
  id,
  status,
}: {
  id: string;
  status: "open" | "in_progress" | "done" | "dismissed";
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertManagerAccess(user);
  const enabled = await isFeatureEnabled("manager_cockpit_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) throw new Error("Not available");

  const item = await prisma.actionCenterItem.findUnique({ where: { id } });
  if (!item || item.organizationId !== user.organizationId) throw new Error("Not found");
  const completed = status === "done" || status === "dismissed";

  const updated = await prisma.actionCenterItem.update({
    where: { id },
    data: {
      status,
      completedAt: completed ? new Date() : null,
      completedByUserId: completed ? user.id : null,
    },
  });
  revalidatePath("/app/manager/home");
  return updated;
}

export async function createCustomActionCenterItem({
  orgId,
  teamId,
  title,
  description,
  dueAt,
}: {
  orgId: string;
  teamId?: string;
  title: string;
  description?: string;
  dueAt?: Date | string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertManagerAccess(user);
  if (user.organizationId !== orgId) throw new Error("Forbidden");
  const enabled = await isFeatureEnabled("manager_cockpit_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) throw new Error("Not available");

  const item = await prisma.actionCenterItem.create({
    data: {
      organizationId: orgId,
      teamId: teamId ?? null,
      managerUserId: user.id,
      type: "custom",
      title,
      description,
      severity: "medium",
      status: "open",
      dueAt: dueAt ? new Date(dueAt) : null,
      createdAt: new Date(),
    },
  });
  revalidatePath("/app/manager/home");
  return item;
}

export async function quickLaunchPulseSurvey(teamId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertManagerAccess(user);
  const enabled = await isFeatureEnabled("manager_cockpit_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) throw new Error("Not available");

  const item = await prisma.actionCenterItem.create({
    data: {
      organizationId: user.organizationId,
      teamId: teamId ?? null,
      managerUserId: user.id,
      type: "survey_todo",
      title: "Launch a quick pulse survey",
      description: "Set up a 3-question pulse for your team this week.",
      severity: "medium",
      status: "open",
      dueAt: new Date(Date.now() + 3 * 86400000),
    },
  });
  revalidatePath("/app/manager/home");
  return item;
}

export async function quickSendAppreciation(teamId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertManagerAccess(user);
  const enabled = await isFeatureEnabled("manager_cockpit_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) throw new Error("Not available");

  const item = await prisma.actionCenterItem.create({
    data: {
      organizationId: user.organizationId,
      teamId: teamId ?? null,
      managerUserId: user.id,
      type: "nudge",
      title: "Send an appreciation nudge",
      description: "Share a quick recognition note with your team.",
      severity: "low",
      status: "open",
      dueAt: new Date(Date.now() + 2 * 86400000),
    },
  });
  revalidatePath("/app/manager/home");
  return item;
}

export async function quickShareReport(teamId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertManagerAccess(user);
  const enabled = await isFeatureEnabled("manager_cockpit_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) throw new Error("Not available");

  // Placeholder: create an action item to follow up sharing
  const item = await prisma.actionCenterItem.create({
    data: {
      organizationId: user.organizationId,
      teamId: teamId ?? null,
      managerUserId: user.id,
      type: "custom",
      title: "Share team report",
      description: "Export and share the latest team report with leadership.",
      severity: "low",
      status: "open",
    },
  });
  revalidatePath("/app/manager/home");
  return item;
}
