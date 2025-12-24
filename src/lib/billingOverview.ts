import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays } from "date-fns";

export async function getBillingOverview(orgId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: { plan: true },
  });
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { featureFlags: true },
  });
  const invoices = (await prisma.invoice.findMany({
    where: { organizationId: orgId },
    orderBy: { periodEnd: "desc" },
    take: 10,
  })) ?? [];
  const promoUses = (await prisma.promoCode.findMany({
    where: { organizationId: orgId, isActive: true },
    take: 5,
  })) ?? [];
  const referralCodes = (await prisma.referralCode.findMany({
    where: { organizationId: orgId },
    take: 5,
  })) ?? [];

  let seatsUsed = 0;
  try {
    seatsUsed = await prisma.user.count({ where: { organizationId: orgId, isDeleted: false } });
  } catch {
    seatsUsed = await prisma.user.count({ where: { organizationId: orgId } });
  }

  const flags = settings?.featureFlags;
  const flagsObj = flags && typeof flags === "object" && !Array.isArray(flags) ? (flags as Record<string, unknown>) : {};
  const fallbackSeats = typeof flagsObj.billingSeats === "number" ? flagsObj.billingSeats : null;
  const pendingSeats = typeof flagsObj.billingPendingSeats === "number" ? flagsObj.billingPendingSeats : null;
  const pendingInvoiceId = typeof flagsObj.billingPendingInvoiceId === "string" ? flagsObj.billingPendingInvoiceId : null;
  const seatsConfigured = (subscription as any)?.seats ?? fallbackSeats ?? null;
  const balanceCents = typeof flagsObj.billingBalanceCents === "number" ? Math.max(0, Math.round(flagsObj.billingBalanceCents)) : 0;
  const fallbackInvoices = Array.isArray(flagsObj.billingInvoices) ? (flagsObj.billingInvoices as any[]) : [];
  const combinedInvoices = [...invoices, ...fallbackInvoices].filter(Boolean);
  const invoicesById = new Map<string, any>();
  combinedInvoices.forEach((inv) => {
    const id = String(inv.id ?? `${inv.periodEnd ?? ""}:${inv.amountCents ?? ""}`);
    if (!invoicesById.has(id)) {
      invoicesById.set(id, { ...inv, id });
    }
  });
  const invoicesSorted = Array.from(invoicesById.values()).sort((a, b) => {
    const aTime = new Date(a.periodEnd ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.periodEnd ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });

  const trialDaysLeft =
    subscription?.trialEndsAt && subscription.status === "trialing"
      ? Math.max(0, differenceInCalendarDays(subscription.trialEndsAt, new Date()))
      : null;

  return {
    subscription,
    plan: subscription?.plan,
    invoices: invoicesSorted,
    promoCodes: promoUses,
    referralCodes,
    seatsUsed,
    balanceCents,
    seatsConfigured,
    pendingSeats,
    pendingInvoiceId,
    trialDaysLeft,
  };
}
