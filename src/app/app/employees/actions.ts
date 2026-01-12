'use server';

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES, type UserRole } from "@/lib/roles";
import { logAuditEvent } from "@/lib/audit";

type CreateEmployeeInput = {
  name: string;
  email: string;
  role: UserRole;
  teamIds: string[];
  slackUserId?: string | null;
};

export async function createEmployee(input: CreateEmployeeInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "You must be signed in." };
  }
  const role = (currentUser.role ?? "").toUpperCase();
  if (!["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) {
    return { error: "You don't have access to add employees." };
  }

  const trimmedEmail = input.email.trim().toLowerCase();
  const trimmedName = input.name.trim();

  if (!trimmedName || !trimmedEmail) {
    return { error: "Name and email are required." };
  }

  if (!USER_ROLES.includes(input.role)) {
    return { error: "Invalid role selected." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: trimmedEmail },
  });
  if (existing) {
    return { error: "This email is already used in another account." };
  }

  const tempPassword = randomBytes(12).toString("base64").slice(0, 16);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      name: trimmedName,
      email: trimmedEmail,
      role: input.role,
      passwordHash,
      organizationId: currentUser.organizationId,
      slackUserId: input.slackUserId?.trim() || null,
    },
  });

  const uniqueTeamIds = Array.from(new Set(input.teamIds ?? []));

  if (uniqueTeamIds.length) {
    const teams = await prisma.team.findMany({
      where: { id: { in: uniqueTeamIds }, organizationId: currentUser.organizationId },
      select: { id: true },
    });
    if (teams.length) {
      await prisma.userTeam.createMany({
        data: teams.map((team: any) => ({ teamId: team.id, userId: user.id })),
      });
    }
  }

  revalidatePath("/app/employees");
  revalidatePath("/app/teams");
  await logAuditEvent({
    organizationId: currentUser.organizationId,
    userId: currentUser.id,
    action: "EMPLOYEE_CREATED",
    targetType: "USER",
    targetId: user.id,
    metadata: { email: user.email, role: user.role },
  });
  return { success: true };
}
