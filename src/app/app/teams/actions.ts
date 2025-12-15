'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getOrgSubscription, checkLimit } from "@/lib/subscription";

type CreateTeamInput = {
  name: string;
  description?: string | null;
  memberIds: string[];
};

type UpdateTeamInput = {
  teamId: string;
  name: string;
  description?: string | null;
  memberIds: string[];
};

export async function createTeam(input: CreateTeamInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "You must be signed in." };
  if (currentUser.role !== "ADMIN") return { error: "You don't have access to create teams." };

  const trimmedName = input.name.trim();
  if (!trimmedName) return { error: "Team name is required." };

  const existing = await prisma.team.findFirst({
    where: { organizationId: currentUser.organizationId, name: trimmedName },
  });
  if (existing) return { error: "A team with this name already exists." };

  const sub = await getOrgSubscription(currentUser.organizationId);
  const teamCount = await prisma.team.count({ where: { organizationId: currentUser.organizationId } });
  if (!checkLimit(teamCount, sub?.plan?.maxTeams ?? null)) {
    return { error: "You’ve reached the team limit on your current plan. Upgrade to add more." };
  }

  const team = await prisma.team.create({
    data: {
      name: trimmedName,
      description: input.description?.trim() || null,
      organizationId: currentUser.organizationId,
    },
  });

  const uniqueMembers = Array.from(new Set(input.memberIds ?? []));

  if (uniqueMembers.length) {
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueMembers }, organizationId: currentUser.organizationId },
      select: { id: true },
    });
    if (users.length) {
      await prisma.userTeam.createMany({
        data: users.map((u: any) => ({ userId: u.id, teamId: team.id })),
      });
    }
  }

  revalidatePath("/app/teams");
  revalidatePath("/app/employees");
  await logAuditEvent({
    organizationId: currentUser.organizationId,
    userId: currentUser.id,
    action: "TEAM_CREATED",
    targetType: "TEAM",
    targetId: team.id,
    metadata: { name: team.name },
  });
  return { success: true };
}

export async function updateTeam(input: UpdateTeamInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "You must be signed in." };
  if (currentUser.role !== "ADMIN") return { error: "You don't have access to edit teams." };

  const team = await prisma.team.findFirst({
    where: { id: input.teamId, organizationId: currentUser.organizationId },
    include: { users: true },
  });
  if (!team) return { error: "Team not found." };

  const trimmedName = input.name.trim();
  if (!trimmedName) return { error: "Team name is required." };

  const uniqueMembers = Array.from(new Set(input.memberIds ?? []));

  await prisma.$transaction([
    prisma.team.update({
      where: { id: team.id },
      data: {
        name: trimmedName,
        description: input.description?.trim() || null,
      },
    }),
    prisma.userTeam.deleteMany({
      where: {
        teamId: team.id,
        userId: { notIn: uniqueMembers },
      },
    }),
    prisma.userTeam.createMany({
      data: uniqueMembers.map((id) => ({ teamId: team.id, userId: id })),
    }),
  ]);

  revalidatePath("/app/teams");
  revalidatePath(`/app/teams/${team.id}`);
  revalidatePath("/app/employees");
  await logAuditEvent({
    organizationId: currentUser.organizationId,
    userId: currentUser.id,
    action: "TEAM_UPDATED",
    targetType: "TEAM",
    targetId: team.id,
    metadata: { name: trimmedName },
  });
  return { success: true };
}
