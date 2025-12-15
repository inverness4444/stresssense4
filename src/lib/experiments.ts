import { prisma } from "@/lib/prisma";

type Variant = { key: string; weight?: number };

function pickVariant(variants: Variant[]) {
  const total = variants.reduce((acc, v) => acc + (v.weight ?? 1), 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const v of variants) {
    acc += v.weight ?? 1;
    if (r <= acc) return v.key;
  }
  return variants[variants.length - 1]?.key ?? "A";
}

export async function assignVariant(experimentKey: string, subjectType: string, subjectId: string, organizationId?: string) {
  const experiment = await prisma.experiment.findFirst({
    where: {
      key: experimentKey,
      status: "active",
      OR: [{ organizationId: organizationId ?? undefined }, { organizationId: null }],
    },
  });
  if (!experiment) return "A";

  const existing = await prisma.experimentAssignment.findFirst({
    where: { experimentId: experiment.id, subjectType, subjectId },
  });
  if (existing) return existing.variantKey;

  const variants: Variant[] = Array.isArray(experiment.variants) ? (experiment.variants as Variant[]) : [];
  const chosen = variants.length ? pickVariant(variants) : "A";
  await prisma.experimentAssignment.create({
    data: {
      experimentId: experiment.id,
      subjectId,
      subjectType,
      variantKey: chosen,
    },
  });
  return chosen;
}

type AssignParams = { experimentKey: string; orgId?: string; userId?: string; anonymousId?: string };

export async function assignVariantV2(params: AssignParams): Promise<{ variantKey: string; variantId: string } | null> {
  const experiment = await prisma.experiment.findFirst({
    where: { key: params.experimentKey, status: "running" },
  });
  if (!experiment) return null;
  const existing = await prisma.experimentAssignment.findFirst({
    where: {
      experimentId: experiment.id,
      OR: [
        params.userId ? { userId: params.userId } : undefined,
        params.anonymousId ? { subjectType: "anon", subjectId: params.anonymousId } : undefined,
      ].filter(Boolean) as { subjectType?: string; subjectId?: string; userId?: string }[],
    },
  });
  if (existing) {
    const variant = await prisma.experimentVariant.findFirst({ where: { experimentId: experiment.id, key: existing.variantKey } });
    if (variant) return { variantKey: variant.key, variantId: variant.id };
  }
  const variants = await prisma.experimentVariant.findMany({ where: { experimentId: experiment.id } });
  const chosen = variants[0];
  if (!chosen) return null;
  await prisma.experimentAssignment.create({
    data: {
      experimentId: experiment.id,
      subjectType: params.userId ? "user" : "anon",
      subjectId: params.userId ?? params.anonymousId ?? "unknown",
      variantKey: chosen.key,
      organizationId: params.orgId,
      userId: params.userId,
    },
  });
  return { variantKey: chosen.key, variantId: chosen.id };
}

export async function trackExposure(params: {
  experimentKey: string;
  variantKey: string;
  orgId?: string;
  userId?: string;
  anonymousId?: string;
  context?: string;
}) {
  const experiment = await prisma.experiment.findFirst({ where: { key: params.experimentKey } });
  if (!experiment) return;
  const variant = await prisma.experimentVariant.findFirst({ where: { experimentId: experiment.id, key: params.variantKey } });
  if (!variant) return;
  await prisma.experimentExposure.create({
    data: {
      experimentId: experiment.id,
      variantId: variant.id,
      organizationId: params.orgId,
      userId: params.userId,
      anonymousId: params.anonymousId,
      context: params.context,
    },
  });
}

export async function trackMetric(params: {
  experimentKey: string;
  variantKey: string;
  orgId?: string;
  userId?: string;
  anonymousId?: string;
  metricKey: string;
  value: number;
  metadata?: unknown;
}) {
  const experiment = await prisma.experiment.findFirst({ where: { key: params.experimentKey } });
  if (!experiment) return;
  const variant = await prisma.experimentVariant.findFirst({ where: { experimentId: experiment.id, key: params.variantKey } });
  if (!variant) return;
  await prisma.experimentMetricEvent.create({
    data: {
      experimentId: experiment.id,
      variantId: variant.id,
      organizationId: params.orgId,
      userId: params.userId,
      anonymousId: params.anonymousId,
      metricKey: params.metricKey,
      value: params.value,
      metadata: params.metadata ?? undefined,
    },
  });
}
