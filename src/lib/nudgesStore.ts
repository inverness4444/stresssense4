import { playbookCategories, playbooks } from "@/data/playbooks";
import { generateTeamNudges, type TeamMetrics } from "@/lib/nudgesEngine";
import { prisma } from "@/lib/prisma";

export function listTemplates(): Promise<any[]> {
  return prisma.nudgeTemplate.findMany();
}

export function listPlaybooks() {
  return playbooks as any;
}

export function listPlaybookCategories() {
  return playbookCategories as any;
}

export async function getPlaybookById(id: string) {
  return playbooks.find((p) => p.id === id);
}

export async function getNudgesForTeam(teamId: string): Promise<any[]> {
  return prisma.nudgeInstance.findMany({ where: { teamId }, include: { template: true } }) as any;
}

export async function getNudgesForOrg(orgId: string): Promise<any[]> {
  return prisma.nudgeInstance.findMany({ where: { orgId }, include: { template: true } }) as any;
}

export async function getNudgesForMember(memberId?: string | null): Promise<any[]> {
  if (!memberId) return [];
  return prisma.nudgeInstance.findMany({ where: { memberId }, include: { template: true } }) as any;
}

export async function createNudgesForTeamFromSurvey(team: any, metrics: TeamMetrics, tags: any[] = []) {
  const generated = generateTeamNudges(team as any, metrics, tags).map((g) => ({
    ...g,
    orgId: team.organizationId as any,
  }));
  const existing = await prisma.nudgeInstance.findMany({ where: { teamId: team.id, status: "todo" } });
  const safeExisting = Array.isArray(existing) ? existing : [];
  const safeGenerated = Array.isArray(generated) ? generated : [];
  const newOnes = safeGenerated.filter((g: any) => !safeExisting.some((e: any) => e?.templateId === g.templateId));
  if (!newOnes.length) return [];
  await prisma.nudgeInstance.createMany({
    data: newOnes.map((n: any) => ({
      orgId: n.orgId,
      teamId: n.teamId,
      memberId: n.memberId ?? null,
      templateId: n.templateId,
      status: "todo",
      source: n.source,
      tags: n.tags,
      notes: n.notes ?? null,
      createdAt: n.createdAt,
      dueAt: n.dueAt ?? null,
      resolvedAt: n.resolvedAt ?? null,
    })),
  });
  return newOnes;
}

export async function createPersonalNudge(params: {
  orgId: string;
  teamId: string;
  memberId: string;
  templateId?: string;
  title?: string;
  description?: string;
  tags?: any[];
}): Promise<any> {
  const template = params.templateId ? await prisma.nudgeTemplate.findUnique({ where: { id: params.templateId } }) : null;
  const fallbackTemplate = template ?? (await prisma.nudgeTemplate.findFirst({ where: { audience: "employee" } }));
  if (!fallbackTemplate) {
    throw new Error("No nudge template available for personal action");
  }
  const created = await prisma.nudgeInstance.create({
    data: {
      orgId: params.orgId,
      teamId: params.teamId,
      memberId: params.memberId,
      templateId: fallbackTemplate.id,
      status: "todo",
      source: "ai",
      notes: template?.description ?? params.description ?? null,
      tags: params.tags ?? template?.triggerTags ?? [],
    },
    include: { template: true },
  });
  return created as any;
}

export async function updateNudgeStatus(id: string, status: any): Promise<any | undefined> {
  const updated = await prisma.nudgeInstance.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "done" ? new Date() : null,
      dueAt: status === "snoozed" ? new Date(Date.now() + 7 * 86400000) : undefined,
    },
    include: { template: true },
  });
  return updated as any;
}

export async function seedDemoNudgesForTeams(teams: any[]) {
  for (const team of teams) {
    const existing = await prisma.nudgeInstance.count({ where: { teamId: team.id } });
    if (existing) continue;
    await createNudgesForTeamFromSurvey(
      team,
      { stressIndex: team.stressIndex ?? 6, engagementScore: team.engagementScore ?? 6, participation: team.participation ?? 70 },
      ["workload", "meetings"]
    );
  }
}

export async function actionBadge(orgId: string) {
  return prisma.nudgeInstance.count({ where: { orgId, status: "todo" } });
}

export function getNudgeWithTemplate(n: any) {
  return n;
}
