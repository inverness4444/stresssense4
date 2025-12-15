import { prisma } from "@/lib/prisma";
import { getActiveModel } from "@/lib/modelRegistry";

export async function computeRiskScore(params: { orgId: string; teamId?: string; userId?: string; surveySignals?: unknown; usageSignals?: unknown }) {
  const model = await getActiveModel("stress_risk");
  // Placeholder score: to be replaced with real model inference.
  const score = 60;
  const result = { score, modelKey: "stress_risk", modelVersionId: model?.id ?? "na" };

  await prisma.modelInferenceLog.create({
    data: {
      modelVersionId: model?.id ?? (await ensurePlaceholderModel()),
      organizationId: params.orgId,
      userId: params.userId,
      inputSnapshot: { surveySignals: params.surveySignals, usageSignals: params.usageSignals } as any,
      output: result,
      latencyMs: 0,
    },
  });
  return result;
}

async function ensurePlaceholderModel() {
  const registry = await prisma.modelRegistry.upsert({
    where: { key: "stress_risk" },
    update: {},
    create: { key: "stress_risk", name: "Stress risk model", type: "risk_score" },
  });
  const existingVersion = await prisma.modelVersion.findFirst({
    where: { registryId: registry.id, version: "placeholder" },
  });
  if (existingVersion) return existingVersion.id;
  const created = await prisma.modelVersion.create({
    data: { registryId: registry.id, version: "placeholder", status: "active", storageUri: "local" },
  });
  return created.id;
}
