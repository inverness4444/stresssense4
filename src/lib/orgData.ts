import { prisma } from "@/lib/prisma";
import { getTeamStatus, type InsightTag, type TeamStatus } from "@/lib/statusLogic";
import { createNudgesForTeamFromSurvey } from "@/lib/nudgesStore";
import crypto from "crypto";

export type Tag = InsightTag | "communication" | "participation" | "wellbeing" | "focus" | "boundaries";

export function generateInviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

export async function ensureInviteToken(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (org?.inviteToken) return org.inviteToken;
  const token = generateInviteToken();
  await prisma.organization.updateMany({ where: { id: orgId }, data: { inviteToken: token } });
  return token;
}

export async function getOrganizations() {
  return prisma.organization.findMany();
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function createDemoOrganization(name: string, ownerEmail?: string) {
  // If a user with this email already exists, reuse their org to avoid unique constraint errors.
  if (ownerEmail) {
    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail }, include: { organization: true } });
    if (existingUser && existingUser.organization) {
      const org = existingUser.organization;
      let team = await prisma.team.findFirst({ where: { organizationId: org.id } });
      if (!team) {
        team = await prisma.team.create({
          data: {
            name: "Demo team",
            description: "Starter team",
            organizationId: org.id,
            stressIndex: 5.5,
            engagementScore: 7.0,
            participation: 0,
            status: "Watch",
          },
        });
      }
      let member = await prisma.member.findFirst({ where: { userId: existingUser.id, organizationId: org.id, teamId: team.id } });
      if (!member) {
        member = await prisma.member.create({
          data: {
            displayName: existingUser.name ?? "Demo manager",
            role: "Manager",
            email: existingUser.email,
            organizationId: org.id,
            teamId: team.id,
            userId: existingUser.id,
          },
        });
      }
      return { org, team, owner: member };
    }
  }

  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "") || `org-${Date.now()}`;
  let slug = base;
  let attempt = 0;
  // ensure slug uniqueness to avoid collisions on repeated demo creation
  // (SQLite in dev will throw otherwise)
  // limit attempts to avoid infinite loop
  while (attempt < 5) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) break;
    attempt += 1;
    slug = `${base}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  const org = await prisma.organization.create({ data: { name, slug, isDemo: true, inviteToken: generateInviteToken() } });
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
