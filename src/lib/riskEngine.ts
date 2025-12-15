import { getPrismaClientForRegion, prisma } from "@/lib/prisma";
import { normalize } from "@/lib/stressMetrics";

export type RiskDriver = {
  key: string;
  label: string;
  contribution: number;
};

export type RiskInput = {
  orgId: string;
  teamId?: string;
  windowStart: Date;
  windowEnd: Date;
};

type RiskResult = {
  riskScore: number;
  stressLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  drivers: RiskDriver[];
  participation: number;
  avgStressIndex: number;
};

async function fetchOrgAndClient(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    throw new Error("Organization not found");
  }
  const client = getPrismaClientForRegion(org.region);
  const settings =
    (await client.organizationSettings.findUnique({ where: { organizationId: orgId } })) ??
    (await prisma.organizationSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId },
      update: {},
    }));
  return { org, client, settings };
}

function resolveStressLevel(score: number): RiskResult["stressLevel"] {
  if (score >= 80) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function buildDrivers(base: number, trend: number, participation: number): RiskDriver[] {
  const drivers: RiskDriver[] = [];
  if (base >= 70) {
    drivers.push({ key: "workload", label: "Workload pressure", contribution: 0.35 });
  }
  if (trend > 0.08) {
    drivers.push({ key: "rising_trend", label: "Rising stress trend", contribution: 0.25 });
  }
  if (participation < 50) {
    drivers.push({ key: "low_participation", label: "Low participation", contribution: 0.2 });
  }
  return drivers.slice(0, 3);
}

function computeScore(base: number, trend: number, participation: number) {
  let score = base;
  if (trend > 0) {
    score += Math.min(20, trend * 120);
  } else if (trend < 0) {
    score += trend * 40;
  }
  if (participation < 40) score += 12;
  else if (participation < 60) score += 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function aggregateStress(
  responses: { answers: { scaleValue: number | null }[] }[],
  scaleMin: number,
  scaleMax: number
) {
  let sum = 0;
  let count = 0;
  responses.forEach((r) =>
    r.answers.forEach((a) => {
      if (a.scaleValue != null) {
        sum += a.scaleValue;
        count += 1;
      }
    })
  );
  if (!count) return 0;
  return normalize(sum / count, scaleMin, scaleMax);
}

export async function computeTeamRisk(input: RiskInput): Promise<RiskResult> {
  const { orgId, teamId, windowStart, windowEnd } = input;
  const { client, settings } = await fetchOrgAndClient(orgId);
  const duration = windowEnd.getTime() - windowStart.getTime();
  const baselineEnd = new Date(windowStart.getTime());
  const baselineStart = new Date(windowStart.getTime() - duration);

  const responses = await client.surveyResponse.findMany({
    where: {
      submittedAt: { gte: windowStart, lte: windowEnd },
      survey: {
        organizationId: orgId,
        ...(teamId ? { targets: { some: { teamId } } } : {}),
      },
    },
    include: { answers: true, survey: true },
  });

  const invites = await client.surveyInviteToken.count({
    where: {
      survey: { organizationId: orgId, ...(teamId ? { targets: { some: { teamId } } } : {}) },
      createdAt: { lte: windowEnd, gte: windowStart },
    },
  });

  const participation = invites ? Math.round((responses.length / invites) * 100) : 0;
  const avgStressIndex = await aggregateStress(responses, settings.stressScaleMin, settings.stressScaleMax);

  const baselineResponses = await client.surveyResponse.findMany({
    where: {
      submittedAt: { gte: baselineStart, lte: baselineEnd },
      survey: { organizationId: orgId, ...(teamId ? { targets: { some: { teamId } } } : {}) },
    },
    include: { answers: true, survey: true },
  });
  const baselineStress = await aggregateStress(baselineResponses, settings.stressScaleMin, settings.stressScaleMax);
  const trend = baselineStress ? (avgStressIndex - baselineStress) / baselineStress : 0;

  const riskScore = computeScore(avgStressIndex, trend, participation);
  const drivers = buildDrivers(avgStressIndex, trend, participation);

  return {
    riskScore,
    stressLevel: resolveStressLevel(riskScore),
    confidence: responses.length ? Math.min(1, responses.length / 20) : 0.2,
    drivers,
    participation,
    avgStressIndex,
  };
}

export async function computeOrgRisk(input: { orgId: string; windowStart: Date; windowEnd: Date }): Promise<RiskResult> {
  return computeTeamRisk({ ...input, teamId: undefined });
}

export async function computeAndStoreTeamRisk(input: RiskInput & { surveyId?: string }) {
  const result = await computeTeamRisk(input);
  const { orgId, teamId, windowStart, windowEnd } = input;
  if (!teamId) return result;
  const { client } = await fetchOrgAndClient(orgId);
  await client.teamRiskSnapshot.create({
    data: {
      organizationId: orgId,
      teamId,
      surveyId: input.surveyId,
      windowStart,
      windowEnd,
      riskScore: result.riskScore,
      stressLevel: result.stressLevel,
      confidence: result.confidence,
      drivers: result.drivers,
    },
  });
  return result;
}

export async function computeAndStoreOrgRisk(input: { orgId: string; windowStart: Date; windowEnd: Date; surveyId?: string }) {
  const result = await computeOrgRisk(input);
  const { orgId, windowStart, windowEnd } = input;
  const { client } = await fetchOrgAndClient(orgId);
  await client.orgRiskSnapshot.create({
    data: {
      organizationId: orgId,
      surveyId: input.surveyId,
      windowStart,
      windowEnd,
      riskScore: result.riskScore,
      stressLevel: result.stressLevel,
      confidence: result.confidence,
      drivers: result.drivers,
    },
  });
  return result;
}

export async function computeRiskSnapshotsForOrg(orgId: string, surveyId?: string) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 1000 * 60 * 60 * 24 * 30);
  const { client } = await fetchOrgAndClient(orgId);
  const teams = await client.team.findMany({ where: { organizationId: orgId } });
  for (const team of teams) {
    await computeAndStoreTeamRisk({ orgId, teamId: team.id, windowStart, windowEnd, surveyId });
  }
  await computeAndStoreOrgRisk({ orgId, windowStart, windowEnd, surveyId });
}
