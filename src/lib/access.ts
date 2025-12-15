import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";

export function isAdmin(user?: { role?: string }) {
  return user?.role === "ADMIN";
}

export function isManager(user?: { role?: string }) {
  return user?.role === "MANAGER";
}

export async function getUserWithTeams() {
  const user = await getCurrentUser();
  if (!user) return null;
  const teams = await prisma.userTeam.findMany({
    where: { userId: user.id },
    select: { teamId: true },
  });
  return { ...user, teamIds: teams.map((t: any) => t.teamId) };
}

export async function ensureOrgSettings(organizationId: string) {
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } });
  if (settings) return settings;
  return prisma.organizationSettings.create({
    data: {
      organizationId,
    },
  });
}

export async function filterAccessibleSurveys(
  userId: string,
  organizationId: string,
  isAdminRole: boolean,
  allowManagerAccessToAllSurveys = false
) {
  if (isAdminRole) {
    return prisma.survey.findMany({
      where: { organizationId },
      include: { targets: true, inviteTokens: true, responses: true },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!allowManagerAccessToAllSurveys) return [];
  const teamIds = (
    await prisma.userTeam.findMany({
      where: { userId },
      select: { teamId: true },
    })
  ).map((t: any) => t.teamId);

  if (!teamIds.length) return [];

  return prisma.survey.findMany({
    where: {
      organizationId,
      targets: { some: { teamId: { in: teamIds } } },
    },
    include: { targets: true, inviteTokens: true, responses: true },
    orderBy: { createdAt: "desc" },
  });
}
