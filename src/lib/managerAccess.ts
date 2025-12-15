import { prisma } from "./prisma";

export async function getAccessibleUserIdsForManager(managerId: string, organizationId: string): Promise<string[]> {
  const directReports = await prisma.user.findMany({
    where: { organizationId, managerId },
    select: { id: true },
  });
  const reportIds = directReports.map((d) => d.id);

  const teamsManaged = await prisma.userTeam.findMany({
    where: { userId: managerId },
    select: { teamId: true },
  });
  const usersInManagedTeams = await prisma.userTeam.findMany({
    where: { teamId: { in: teamsManaged.map((t) => t.teamId) } },
    select: { userId: true },
  });

  const ids = new Set<string>();
  ids.add(managerId);
  reportIds.forEach((id) => ids.add(id));
  usersInManagedTeams.forEach((u) => ids.add(u.userId));
  return Array.from(ids);
}
