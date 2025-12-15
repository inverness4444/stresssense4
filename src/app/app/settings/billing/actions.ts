'use server';

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { revalidatePath } from "next/cache";

export async function applyPromoCode(orgId: string, code: string) {
  const user = await getCurrentUser();
  if (!user || user.organizationId !== orgId || user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  if (!enabled) throw new Error("Feature disabled");

  const promo = await prisma.promoCode.findFirst({
    where: {
      code,
      isActive: true,
      OR: [{ organizationId: null }, { organizationId: orgId }],
      AND: [
        { validFrom: { lte: new Date() } },
        { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
      ],
    },
  });
  if (!promo) {
    throw new Error("Invalid code");
  }
  if (promo.maxRedemptions && promo.redemptions >= promo.maxRedemptions) {
    throw new Error("Code usage exceeded");
  }
  await prisma.subscription.updateMany({
    where: { organizationId: orgId },
    data: { // for MVP store code in external fields
      cancelReason: `PROMO:${promo.code}`,
    },
  });
  await prisma.promoCode.update({ where: { id: promo.id }, data: { redemptions: { increment: 1 } } });
  revalidatePath("/app/settings/billing");
}

export async function generateReferralCode(orgId: string) {
  const user = await getCurrentUser();
  if (!user || user.organizationId !== orgId || user.role !== "ADMIN") throw new Error("Forbidden");
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  if (!enabled) throw new Error("Feature disabled");
  const existing = await prisma.referralCode.findFirst({ where: { organizationId: orgId, createdByUserId: user.id } });
  if (existing) return existing;
  const code = `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const rc = await prisma.referralCode.create({
    data: {
      organizationId: orgId,
      createdByUserId: user.id,
      code,
      description: "Referral link",
    },
  });
  revalidatePath("/app/settings/billing");
  return rc;
}

export async function updateSubscriptionSeats(orgId: string, seats: number) {
  const user = await getCurrentUser();
  if (!user || user.organizationId !== orgId || user.role !== "ADMIN") throw new Error("Forbidden");
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  if (!enabled) throw new Error("Feature disabled");
  await prisma.subscription.updateMany({ where: { organizationId: orgId }, data: { seats } });
  revalidatePath("/app/settings/billing");
}
