import { prisma } from "@/lib/prisma";

type RecommendationContext = {
  orgId: string;
  teamId?: string;
  riskDrivers?: string[];
  anomalyMetrics?: string[];
  role: "MANAGER" | "HR" | "EXEC";
};

function matches(templateTags: string[], drivers: string[], anomalyMetrics: string[]) {
  if (!templateTags.length) return false;
  return templateTags.some((tag) => drivers.includes(tag) || anomalyMetrics.includes(tag));
}

export async function getRecommendationsForContext(ctx: RecommendationContext) {
  const templates = await prisma.recommendationTemplate.findMany({
    where: {
      isActive: true,
      OR: [
        { organizationId: ctx.orgId },
        { organizationId: null },
      ],
    },
  });
  const drivers = ctx.riskDrivers ?? [];
  const anomalies = ctx.anomalyMetrics ?? [];
  const filtered = templates.filter((t: any) => {
    if (t.audience && t.audience !== ctx.role) return false;
    if (t.triggerTags?.length) return matches(t.triggerTags, drivers, anomalies);
    return true;
  });
  return filtered;
}
