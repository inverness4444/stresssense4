import { prisma } from "./prisma";
import { BILLING_MODEL, MIN_SEATS, normalizeSeats } from "@/config/pricing";

export async function getOrgSubscription(orgId: string) {
  let seatsUsed = 0;
  try {
    seatsUsed = await prisma.user.count({ where: { organizationId: orgId, isDeleted: false } });
  } catch {
    seatsUsed = await prisma.user.count({ where: { organizationId: orgId } });
  }
  const normalizedSeats = normalizeSeats(seatsUsed || MIN_SEATS);
  let sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });
  if (!sub) {
    sub = await prisma.subscription.create({
      data: {
        organizationId: orgId,
        status: "active",
        seats: normalizedSeats,
      },
    });
  } else if (typeof (sub as any).seats === "number" && (sub as any).seats < normalizedSeats) {
    sub = await prisma.subscription.update({
      where: { organizationId: orgId },
      data: { seats: normalizedSeats },
    });
  }
  await prisma.organizationSettings.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, featureFlags: { billingModel: BILLING_MODEL, billingSeats: normalizedSeats } },
    update: { featureFlags: { billingModel: BILLING_MODEL, billingSeats: normalizedSeats } },
  });
  return sub;
}

export function checkLimit(count: number, limit?: number | null) {
  if (limit == null) return true;
  return count < limit;
}
