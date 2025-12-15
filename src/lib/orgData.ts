import { prisma } from "@/lib/prisma";
import { getTeamStatus, type InsightTag, type TeamStatus } from "@/lib/statusLogic";
import { createNudgesForTeamFromSurvey } from "@/lib/nudgesStore";

export type Tag = InsightTag | "communication" | "participation" | "wellbeing" | "focus" | "boundaries";

export async function getOrganizations() {
  return prisma.organization.findMany();
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function createDemoOrganization(name: string, ownerEmail?: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "") || `org-${Date.now()}`;
  const org = await prisma.organization.create({ data: { name, slug } });
  const team = await prisma.team.create({
    data: {
      name: "Пилотная команда",
      description: "Starter team",
      organizationId: org.id,
      stressIndex: 5.5,
      engagementScore: 7.0,
      participation: 0,
      status: "Watch",
    },
  });
  const user = await prisma.user.create({
    data: {
      email: ownerEmail ?? "manager@demo.local",
      name: "Новый менеджер",
      passwordHash: "",
      role: "Manager",
      organizationId: org.id,
    },
  });
  const member = await prisma.member.create({
    data: {
      displayName: "Новый менеджер",
      role: "Manager",
      email: user.email,
      organizationId: org.id,
      teamId: team.id,
      userId: user.id,
    },
  });
  return { org, team, owner: member };
}

export async function getTeamsByOrg(orgId: string) {
  return prisma.team.findMany({ where: { organizationId: orgId } });
}

export async function getTeamById(id: string) {
  return prisma.team.findUnique({ where: { id } });
}

export async function getMembersByTeam(teamId: string) {
  return prisma.member.findMany({ where: { teamId } });
}

export async function getMemberById(memberId: string) {
  return prisma.member.findUnique({ where: { id: memberId } });
}

export async function getMembersForOrg(orgId: string) {
  return prisma.member.findMany({ where: { organizationId: orgId } });
}

export async function getSurveyRunsByOrg(orgId: string) {
  return prisma.surveyRun.findMany({ where: { orgId }, orderBy: { launchedAt: "desc" } });
}

export async function getSurveyRunsByTeam(teamId: string) {
  return prisma.surveyRun.findMany({ where: { teamId }, orderBy: { launchedAt: "desc" } });
}

export async function createSurveyRun(input: {
  orgId: string;
  teamId?: string | null;
  templateId: string;
  title: string;
  launchedByUserId: string;
  targetCount: number;
}) {
  return prisma.surveyRun.create({
    data: {
      orgId: input.orgId,
      teamId: input.teamId ?? null,
      templateId: input.templateId,
      title: input.title,
      launchedByUserId: input.launchedByUserId,
      targetCount: input.targetCount,
    },
  });
}

export async function saveSurveyResponse(runId: string, params: { memberId?: string; respondentEmail?: string; answers: any }) {
  const response = await prisma.surveyResponse.create({
    data: {
      runId,
      memberId: params.memberId ?? null,
      respondentEmail: params.respondentEmail ?? null,
      answers: params.answers,
    },
  });
  return response;
}

export async function updateSurveyRunAggregates(runId: string, metrics: { stressIndex: number; engagementScore: number; tags?: InsightTag[] }) {
  await prisma.surveyRun.update({
    where: { id: runId },
    data: {
      avgStressIndex: metrics.stressIndex,
      avgEngagementScore: metrics.engagementScore,
      completedCount: { increment: 1 } as any,
      tags: metrics.tags ?? [],
    },
  });
}

export async function updateTeamMetricsFromSurvey(teamId: string, metrics: { stressIndex: number; engagementScore: number; participation: number }, tags: InsightTag[] = []) {
  const status = getTeamStatus(metrics.stressIndex, metrics.engagementScore, metrics.participation);
  await prisma.team.update({
    where: { id: teamId },
    data: {
      stressIndex: metrics.stressIndex,
      engagementScore: metrics.engagementScore,
      participation: metrics.participation,
      status: status === "calm" ? "Calm" : status === "watch" ? "Watch" : status === "underPressure" ? "UnderPressure" : "AtRisk",
      lastPulseAt: new Date(),
    },
  });
  await prisma.teamMetricsHistory.create({
    data: {
      teamId,
      periodLabel: new Date().toISOString().slice(0, 10),
      stressIndex: metrics.stressIndex,
      engagementScore: metrics.engagementScore,
      participation: metrics.participation,
      tags,
    },
  });
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (team) {
    await createNudgesForTeamFromSurvey(team as any, { stressIndex: metrics.stressIndex, engagementScore: metrics.engagementScore, participation: metrics.participation }, tags);
  }
}

export async function updateMemberFromPulse(memberId: string, metrics: { wellbeing?: number; engagementScore?: number; tags?: InsightTag[] }) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return;
  await prisma.employeeMetrics.upsert({
    where: { memberId },
    update: {
      wellbeing: metrics.wellbeing ?? undefined,
      lastStressIndex: metrics.engagementScore ?? undefined,
      lastUpdatedAt: new Date(),
    },
    create: {
      memberId,
      wellbeing: metrics.wellbeing,
      lastStressIndex: metrics.engagementScore,
    },
  });
}
