import { prisma } from "./prisma";

export async function getOnboardingStatus(organizationId: string) {
  const [teams, employees, surveys] = await Promise.all([
    prisma.team.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId, role: { in: ["EMPLOYEE", "MANAGER"] } } }),
    prisma.survey.count({ where: { organizationId } }),
  ]);

  return {
    hasTeams: teams > 0,
    hasEmployees: employees > 0,
    hasSurveys: surveys > 0,
  };
}
