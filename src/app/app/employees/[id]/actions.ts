'use server';

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { anonymizeUser } from "@/lib/gdpr";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function anonymize(formData: FormData) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) redirect("/signin");
  const targetId = formData.get("userId") as string;
  if (!targetId) {
    throw new Error("Missing user id.");
  }
  const targetUser = await prisma.user.findFirst({
    where: { id: targetId, organizationId: user.organizationId },
  });
  if (!targetUser) {
    throw new Error("User not found.");
  }
  const isSelf =
    targetUser.id === user.id ||
    (targetUser.email && user.email && targetUser.email.toLowerCase() === user.email.toLowerCase());
  if (isSelf) {
    throw new Error("Cannot anonymize yourself.");
  }
  await anonymizeUser(targetUser.id, user.organizationId, user.id);
  redirect("/app/employees");
}

export async function updateEmployeeTeams(formData: FormData) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(role)) redirect("/signin");

  const targetId = String(formData.get("userId") ?? "").trim();
  if (!targetId) {
    throw new Error("Missing user id.");
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetId, organizationId: user.organizationId },
  });
  if (!targetUser) {
    throw new Error("User not found.");
  }
  if ((targetUser.role ?? "").toUpperCase() === "SUPER_ADMIN") {
    throw new Error("Cannot edit super admin.");
  }

  const rawTeamIds = formData.getAll("teamIds").map((id) => String(id));
  const uniqueTeamIds = Array.from(new Set(rawTeamIds.map((id) => id.trim()).filter(Boolean)));
  const teams = uniqueTeamIds.length
    ? await prisma.team.findMany({
        where: { id: { in: uniqueTeamIds }, organizationId: user.organizationId },
        select: { id: true },
      })
    : [];
  const allowedTeamIds = teams.map((t) => t.id);

  await prisma.$transaction(async (tx) => {
    await tx.userTeam.deleteMany({ where: { userId: targetUser.id } });
    if (allowedTeamIds.length) {
      await tx.userTeam.createMany({
        data: allowedTeamIds.map((teamId) => ({ teamId, userId: targetUser.id })),
      });
    }
  });

  revalidatePath("/app/employees");
  revalidatePath(`/app/employees/${targetUser.id}`);
  revalidatePath("/app/teams");
}

export async function updateEmployeeRole(formData: FormData) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) redirect("/signin");

  const targetId = String(formData.get("userId") ?? "").trim();
  const nextRole = String(formData.get("role") ?? "").trim().toUpperCase();
  if (!targetId) {
    throw new Error("Missing user id.");
  }
  if (!["EMPLOYEE", "MANAGER"].includes(nextRole)) {
    throw new Error("Invalid role.");
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetId, organizationId: user.organizationId },
  });
  if (!targetUser) {
    throw new Error("User not found.");
  }
  const targetRole = (targetUser.role ?? "").toUpperCase();
  if (["ADMIN", "HR", "SUPER_ADMIN"].includes(targetRole)) {
    throw new Error("Cannot change admin roles.");
  }
  if (targetUser.id === user.id) {
    throw new Error("Cannot change your own role.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: { role: nextRole },
    });
    await tx.member.updateMany({
      where: { userId: targetUser.id, organizationId: user.organizationId },
      data: { role: nextRole as any },
    });
  });

  await logAuditEvent({
    organizationId: user.organizationId,
    userId: user.id,
    action: "EMPLOYEE_ROLE_CHANGED",
    targetType: "USER",
    targetId: targetUser.id,
    metadata: { from: targetRole, to: nextRole },
  });

  revalidatePath("/app/employees");
  revalidatePath(`/app/employees/${targetUser.id}`);
}
