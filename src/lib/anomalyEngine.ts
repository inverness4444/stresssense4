import { getPrismaClientForRegion, prisma } from "@/lib/prisma";
import { normalize } from "@/lib/stressMetrics";

type AnomalyScope = { orgId: string; teamId?: string };

type DetectOptions = {
  metric?: "stress_index" | "participation";
  windowDays?: number;
  baselineDays?: number;
};

async function fetchOrgClient(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");
  return { org, client: getPrismaClientForRegion(org.region) };
}

async function computeMetrics(orgId: string, teamId: string | undefined, windowStart: Date, windowEnd: Date) {
  const { client } = await fetchOrgClient(orgId);
  const responses = await client.surveyResponse.findMany({
    where: {
      submittedAt: { gte: windowStart, lte: windowEnd },
      survey: { organizationId: orgId, ...(teamId ? { targets: { some: { teamId } } } : {}) },
    },
    include: { answers: true },
  });
  const invites = await client.surveyInviteToken.count({
    where: {
      survey: { organizationId: orgId, ...(teamId ? { targets: { some: { teamId } } } : {}) },
      createdAt: { gte: windowStart, lte: windowEnd },
    },
  });
  const participation = invites ? Math.round((responses.length / invites) * 100) : 0;
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
  const avg = count ? normalize(sum / count, 1, 5) : 0;
  return { stressIndex: avg, participation };
}

export async function detectAnomaliesForScope(scope: AnomalyScope, options?: DetectOptions) {
  const metric = options?.metric ?? "stress_index";
  const windowDays = options?.windowDays ?? 30;
  const baselineDays = options?.baselineDays ?? windowDays;
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowDays * 86400000);
  const baselineEnd = new Date(windowStart.getTime());
  const baselineStart = new Date(baselineEnd.getTime() - baselineDays * 86400000);

  const current = await computeMetrics(scope.orgId, scope.teamId, windowStart, windowEnd);
  const baseline = await computeMetrics(scope.orgId, scope.teamId, baselineStart, baselineEnd);

  const currentValue = metric === "stress_index" ? current.stressIndex : current.participation;
  const baselineValue = metric === "stress_index" ? baseline.stressIndex : baseline.participation;
  if (!baselineValue && !currentValue) return [];

  const diff = currentValue - baselineValue;
  const relative = baselineValue ? diff / baselineValue : currentValue > 0 ? 1 : 0;
  const threshold = metric === "stress_index" ? 8 : 0.12;

  if (Math.abs(diff) < threshold && Math.abs(relative) < 0.12) return [];

  const severity = Math.abs(relative) > 0.25 || Math.abs(diff) > threshold * 2 ? "high" : Math.abs(relative) > 0.18 ? "medium" : "low";
  const changeDirection = diff >= 0 ? "up" : "down";

  return [
    {
      organizationId: scope.orgId,
      scopeType: scope.teamId ? "TEAM" : "ORG",
      scopeId: scope.teamId,
      teamId: scope.teamId,
      metric,
      windowStart,
      windowEnd,
      baselineWindowStart: baselineStart,
      baselineWindowEnd: baselineEnd,
      changeDirection,
      changeMagnitude: relative,
      statisticalScore: null,
      severity,
      details: { currentValue, baselineValue, absoluteChange: diff },
      createdAt: new Date(),
    },
  ];
}

export async function detectAndStoreAnomalies(orgId: string, teamIds: string[]) {
  const { client } = await fetchOrgClient(orgId);
  const scopes: AnomalyScope[] = [{ orgId }];
  teamIds.forEach((t) => scopes.push({ orgId, teamId: t }));
  for (const scope of scopes) {
    const events = await detectAnomaliesForScope(scope);
    for (const event of events) {
      await client.anomalyEvent.create({ data: event });
    }
  }
}
