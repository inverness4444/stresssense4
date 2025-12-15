import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { revalidatePath } from "next/cache";
import { suggestCompRecommendation } from "@/lib/compensationAiHelper";

export async function upsertCompRecommendation(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const cycleId = String(formData.get("cycleId") || "");
  const participantId = String(formData.get("participantId") || "");
  const enabled = await isFeatureEnabled("compensation_module_v1", { organizationId: user.organizationId });
  if (!enabled) throw new Error("Feature disabled");

  const proposedBase = formData.get("proposedBase") ? Number(formData.get("proposedBase")) : null;
  const proposedBonusPct = formData.get("proposedBonusPct") ? Number(formData.get("proposedBonusPct")) : null;
  const proposedBandId = String(formData.get("proposedBandId") || "") || null;
  const rationale = String(formData.get("rationale") || "") || null;

  const existing = await prisma.compensationReviewRecommendation.findFirst({
    where: { participantId, cycleId },
  });

  if (existing) {
    await prisma.compensationReviewRecommendation.update({
      where: { id: existing.id },
      data: { proposedBase, proposedBonusPct, proposedBandId: proposedBandId || null, rationale, createdById: user.id },
    });
  } else {
    await prisma.compensationReviewRecommendation.create({
      data: {
        cycleId,
        participantId,
        organizationId: user.organizationId,
        proposedBase,
        proposedBonusPct,
        proposedBandId: proposedBandId || null,
        rationale,
        createdById: user.id,
        status: "draft",
      },
    });
  }
  revalidatePath("/app/manager/compensation");
}

export async function requestCompAiSuggestion(cycleId: string, participantId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const enabled = await isFeatureEnabled("compensation_module_v1", { organizationId: user.organizationId });
  if (!enabled) throw new Error("Feature disabled");
  return suggestCompRecommendation({ orgId: user.organizationId, cycleId, participantId });
}
