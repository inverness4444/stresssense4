'use server';

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { revalidatePath } from "next/cache";
import { getTierForSeats } from "@/lib/pricingTiers";

export async function applyPromoCode(orgId: string, code: string) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || user.organizationId !== orgId || !["ADMIN", "HR"].includes(role)) {
    return { error: "Forbidden" };
  }
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  if (!enabled) return { error: "Feature disabled" };

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
    return { error: "Invalid code" };
  }
  if (promo.maxRedemptions && promo.redemptions >= promo.maxRedemptions) {
    return { error: "Code usage exceeded" };
  }
  await prisma.subscription.updateMany({
    where: { organizationId: orgId },
    data: { // for MVP store code in external fields
      cancelReason: `PROMO:${promo.code}`,
    },
  });
  await prisma.promoCode.update({ where: { id: promo.id }, data: { redemptions: { increment: 1 } } });
  revalidatePath("/app/settings/billing");
  return { success: true };
}

export async function generateReferralCode(orgId: string) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || user.organizationId !== orgId || !["ADMIN", "HR"].includes(role)) return { error: "Forbidden" };
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  if (!enabled) return { error: "Feature disabled" };
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
  const role = (user?.role ?? "").toUpperCase();
  if (!user || user.organizationId !== orgId || !["ADMIN", "HR"].includes(role)) return { error: "Forbidden" };
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  if (!enabled) return { error: "Feature disabled" };

  let seatsUsed = 0;
  try {
    seatsUsed = await prisma.user.count({ where: { organizationId: orgId, isDeleted: false } });
  } catch {
    seatsUsed = await prisma.user.count({ where: { organizationId: orgId } });
  }

  const requestedSeats = Math.max(seatsUsed, Math.floor(seats));
  if (!Number.isFinite(requestedSeats) || requestedSeats <= 0) return { error: "Invalid seats" };

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { featureFlags: true },
  });
  const flags = settings?.featureFlags;
  const flagsObj = flags && typeof flags === "object" && !Array.isArray(flags) ? (flags as Record<string, unknown>) : {};
  const nextFlags: Record<string, unknown> = { ...flagsObj };
  let shouldSaveFlags = false;

  const pendingSeats = typeof flagsObj.billingPendingSeats === "number" ? flagsObj.billingPendingSeats : null;
  const pendingInvoiceId = typeof flagsObj.billingPendingInvoiceId === "string" ? flagsObj.billingPendingInvoiceId : null;
  const existingInvoices = Array.isArray(nextFlags.billingInvoices) ? (nextFlags.billingInvoices as any[]) : [];
  let nextInvoices = existingInvoices;

  const voidPendingInvoice = async () => {
    if (pendingInvoiceId) {
      try {
        await prisma.invoice.update({ where: { id: pendingInvoiceId }, data: { status: "void" } });
      } catch {
        // ignore if invoice table isn't available
      }
      if (existingInvoices.length) {
        nextInvoices = existingInvoices.map((inv) =>
          inv?.id === pendingInvoiceId && inv?.status === "open" ? { ...inv, status: "void" } : inv
        );
      }
    }
  };

  const tier = getTierForSeats(requestedSeats);
  if (tier.priceUsd <= 0) {
    await voidPendingInvoice();
    const updateResult = await prisma.subscription.updateMany({ where: { organizationId: orgId }, data: { seats: requestedSeats } });
    if (!updateResult || typeof (updateResult as any).count !== "number" || (updateResult as any).count === 0) {
      nextFlags.billingSeats = requestedSeats;
      shouldSaveFlags = true;
    }
    if (pendingSeats != null || pendingInvoiceId) {
      delete nextFlags.billingPendingSeats;
      delete nextFlags.billingPendingInvoiceId;
      delete nextFlags.billingPendingAmountCents;
      shouldSaveFlags = true;
    }
    if (nextInvoices !== existingInvoices) {
      nextFlags.billingInvoices = nextInvoices;
      shouldSaveFlags = true;
    }
  } else {
    if (pendingSeats === requestedSeats && pendingInvoiceId) {
      revalidatePath("/app/settings/billing");
      return { success: true };
    }

    await voidPendingInvoice();
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const invoiceAmount = Math.round(tier.priceUsd * 100);
    const invoiceData = {
      organizationId: orgId,
      periodStart: now,
      periodEnd,
      amountCents: invoiceAmount,
      status: "open",
    } as const;

    let invoiceId: string | null = null;
    try {
      const createdInvoice = await prisma.invoice.create({ data: invoiceData });
      invoiceId = createdInvoice?.id ?? null;
    } catch {
      invoiceId = null;
    }

    if (!invoiceId) {
      const fallbackInvoice = {
        id: `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        organizationId: orgId,
        amountCents: invoiceAmount,
        status: "open",
        periodStart: invoiceData.periodStart.toISOString(),
        periodEnd: invoiceData.periodEnd.toISOString(),
        createdAt: now.toISOString(),
      };
      nextInvoices = [...existingInvoices, fallbackInvoice].slice(-20);
      invoiceId = fallbackInvoice.id;
    }

    nextFlags.billingPendingSeats = requestedSeats;
    nextFlags.billingPendingInvoiceId = invoiceId;
    nextFlags.billingPendingAmountCents = invoiceAmount;
    shouldSaveFlags = true;
    if (nextInvoices !== existingInvoices) {
      nextFlags.billingInvoices = nextInvoices;
      shouldSaveFlags = true;
    }
  }

  if (shouldSaveFlags) {
    await prisma.organizationSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, featureFlags: nextFlags },
      update: { featureFlags: nextFlags },
    });
  }

  revalidatePath("/app/settings/billing");
  return { success: true };
}

export async function topUpBalance(orgId: string, amount: number) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || user.organizationId !== orgId || !["ADMIN", "HR"].includes(role)) return { error: "Forbidden" };
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  if (!enabled) return { error: "Feature disabled" };

  const amountCents = Number.isFinite(amount) ? Math.round(amount * 100) : 0;
  if (amountCents <= 0) return { error: "Invalid amount" };

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { featureFlags: true },
  });
  const flags = settings?.featureFlags;
  const flagsObj = flags && typeof flags === "object" && !Array.isArray(flags) ? (flags as Record<string, unknown>) : {};
  const currentCents = typeof flagsObj.billingBalanceCents === "number" ? flagsObj.billingBalanceCents : 0;
  const nextFlags = { ...flagsObj, billingBalanceCents: currentCents + amountCents };

  await prisma.organizationSettings.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, featureFlags: nextFlags },
    update: { featureFlags: nextFlags },
  });

  revalidatePath("/app/settings/billing");
  return { success: true };
}

export async function payLatestInvoice(orgId: string) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || user.organizationId !== orgId || !["ADMIN", "HR"].includes(role)) return { error: "Forbidden" };
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  if (!enabled) return { error: "Feature disabled" };

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { featureFlags: true },
  });
  const flags = settings?.featureFlags;
  const flagsObj = flags && typeof flags === "object" && !Array.isArray(flags) ? (flags as Record<string, unknown>) : {};
  const currentBalance = typeof flagsObj.billingBalanceCents === "number" ? flagsObj.billingBalanceCents : 0;
  const pendingSeats = typeof flagsObj.billingPendingSeats === "number" ? flagsObj.billingPendingSeats : null;
  const pendingInvoiceId = typeof flagsObj.billingPendingInvoiceId === "string" ? flagsObj.billingPendingInvoiceId : null;
  let shouldSaveFlags = false;
  const nextFlags: Record<string, unknown> = { ...flagsObj };

  let dbInvoice: any = null;
  if (pendingInvoiceId) {
    try {
      dbInvoice = await prisma.invoice.findUnique({ where: { id: pendingInvoiceId } });
      if (dbInvoice?.status !== "open") dbInvoice = null;
    } catch {
      dbInvoice = null;
    }
  }
  if (!dbInvoice) {
    dbInvoice = await prisma.invoice.findFirst({
      where: { organizationId: orgId, status: "open" },
      orderBy: { createdAt: "desc" },
    });
  }
  if (dbInvoice) {
    const amount = dbInvoice.amountCents ?? 0;
    const nextBalance = Math.max(0, currentBalance - amount);
    await prisma.invoice.update({ where: { id: dbInvoice.id }, data: { status: "paid" } });
    nextFlags.billingBalanceCents = nextBalance;
    shouldSaveFlags = true;
    if (pendingSeats != null) {
      const updateResult = await prisma.subscription.updateMany({ where: { organizationId: orgId }, data: { seats: pendingSeats } });
      if (!updateResult || typeof (updateResult as any).count !== "number" || (updateResult as any).count === 0) {
        nextFlags.billingSeats = pendingSeats;
        shouldSaveFlags = true;
      }
      delete nextFlags.billingPendingSeats;
      delete nextFlags.billingPendingInvoiceId;
      delete nextFlags.billingPendingAmountCents;
      shouldSaveFlags = true;
    }
    if (shouldSaveFlags) {
      await prisma.organizationSettings.upsert({
        where: { organizationId: orgId },
        create: { organizationId: orgId, featureFlags: nextFlags },
        update: { featureFlags: nextFlags },
      });
    }
    revalidatePath("/app/settings/billing");
    return { success: true };
  }

  const fallbackInvoices = Array.isArray(flagsObj.billingInvoices) ? (flagsObj.billingInvoices as any[]) : [];
  let openIndex = pendingInvoiceId
    ? fallbackInvoices.findIndex((inv) => inv?.status === "open" && inv?.id === pendingInvoiceId)
    : -1;
  if (openIndex === -1) {
    openIndex = fallbackInvoices.findIndex((inv) => inv?.status === "open");
  }
  if (openIndex === -1) return { error: "No open invoice" };

  const invoice = fallbackInvoices[openIndex];
  const amount = Number(invoice?.amountCents ?? 0);
  const nextBalance = Math.max(0, currentBalance - amount);
  const nextInvoices = [...fallbackInvoices];
  nextInvoices[openIndex] = { ...invoice, status: "paid", paidAt: new Date().toISOString() };
  nextFlags.billingBalanceCents = nextBalance;
  nextFlags.billingInvoices = nextInvoices;
  shouldSaveFlags = true;
  if (pendingSeats != null) {
    const updateResult = await prisma.subscription.updateMany({ where: { organizationId: orgId }, data: { seats: pendingSeats } });
    if (!updateResult || typeof (updateResult as any).count !== "number" || (updateResult as any).count === 0) {
      nextFlags.billingSeats = pendingSeats;
      shouldSaveFlags = true;
    }
    delete nextFlags.billingPendingSeats;
    delete nextFlags.billingPendingInvoiceId;
    delete nextFlags.billingPendingAmountCents;
    shouldSaveFlags = true;
  }

  if (shouldSaveFlags) {
    await prisma.organizationSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, featureFlags: nextFlags },
      update: { featureFlags: nextFlags },
    });
  }

  revalidatePath("/app/settings/billing");
  return { success: true };
}
