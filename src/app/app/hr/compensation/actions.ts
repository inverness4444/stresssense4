import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { revalidatePath } from "next/cache";
import { addJob } from "@/lib/queue";

export async function createCompensationBand(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  const enabled = await isFeatureEnabled("compensation_module_v1", { organizationId: user.organizationId });
  if (!enabled) throw new Error("Feature disabled");
  await prisma.compensationBand.create({
    data: {
      organizationId: user.organizationId,
      key: String(formData.get("key") || "").trim(),
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "") || null,
      currency: String(formData.get("currency") || "USD"),
      minBase: Number(formData.get("minBase") || 0),
      midBase: formData.get("midBase") ? Number(formData.get("midBase")) : null,
      maxBase: Number(formData.get("maxBase") || 0),
      minBonusPct: formData.get("minBonusPct") ? Number(formData.get("minBonusPct")) : null,
      maxBonusPct: formData.get("maxBonusPct") ? Number(formData.get("maxBonusPct")) : null,
      jobFamily: String(formData.get("jobFamily") || "") || null,
      level: formData.get("level") ? Number(formData.get("level")) : null,
    },
  });
  revalidatePath("/app/hr/compensation");
}

export async function createCompensationReviewCycle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  const enabled = await isFeatureEnabled("compensation_module_v1", { organizationId: user.organizationId });
  if (!enabled) throw new Error("Feature disabled");
  await prisma.compensationReviewCycle.create({
    data: {
      organizationId: user.organizationId,
      title: String(formData.get("title") || "New cycle"),
      key: String(formData.get("key") || "").trim(),
      description: String(formData.get("description") || "") || null,
      currency: String(formData.get("currency") || "USD"),
      periodStart: new Date(String(formData.get("periodStart") || new Date().toISOString())),
      periodEnd: new Date(String(formData.get("periodEnd") || new Date().toISOString())),
      createdById: user.id,
      status: "draft",
    },
  });
  revalidatePath("/app/hr/compensation");
}

export async function configureCycleParticipants(cycleId: string, participantIds: string[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  const enabled = await isFeatureEnabled("compensation_module_v1", { organizationId: user.organizationId });
  if (!enabled) throw new Error("Feature disabled");
  const participants = participantIds.map((id) => ({
    organizationId: user.organizationId,
    cycleId,
    userId: id,
  }));
  await prisma.compensationReviewParticipant.createMany({ data: participants, skipDuplicates: true });
  // trigger prep job
  await addJob("prepareCompensationCycleData", { cycleId });
  revalidatePath("/app/hr/compensation");
}

export async function changeCompCycleStatus(cycleId: string, status: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  const enabled = await isFeatureEnabled("compensation_module_v1", { organizationId: user.organizationId });
  if (!enabled) throw new Error("Feature disabled");
  await prisma.compensationReviewCycle.update({ where: { id: cycleId }, data: { status } });
  if (status === "planning" || status === "in_review") {
    await addJob("prepareCompensationCycleData", { cycleId });
  }
  revalidatePath("/app/hr/compensation");
}

export async function lockCompCycle(cycleId: string, lockDate?: Date) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  const enabled = await isFeatureEnabled("compensation_module_v1", { organizationId: user.organizationId });
  if (!enabled) throw new Error("Feature disabled");
  await prisma.compensationReviewCycle.update({
    where: { id: cycleId },
    data: { lockDate: lockDate ?? new Date(), status: "approved" },
  });
  revalidatePath("/app/hr/compensation");
}
