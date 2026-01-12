import { prisma } from "@/lib/prisma";

const INVOICE_GRACE_DAYS = 35;

function parseDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInvoiceActive(
  inv: {
    status?: string | null;
    periodEnd?: string | Date | null;
    paidAt?: string | Date | null;
    updatedAt?: string | Date | null;
    createdAt?: string | Date | null;
    amountCents?: number | null;
    amountDue?: number | null;
  } | null,
  now: Date
) {
  if (!inv || inv.status !== "paid") return false;
  const amountCents =
    typeof inv.amountCents === "number"
      ? inv.amountCents
      : typeof inv.amountDue === "number"
        ? inv.amountDue
        : null;
  if (amountCents == null || amountCents <= 0) return false;
  const periodEnd = parseDate(inv.periodEnd);
  if (periodEnd && periodEnd.getTime() >= now.getTime()) return true;
  const reference = parseDate(inv.paidAt) ?? parseDate(inv.updatedAt) ?? parseDate(inv.createdAt);
  if (!reference) return false;
  const diffMs = now.getTime() - reference.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return diffDays <= INVOICE_GRACE_DAYS;
}

const TRIAL_DAYS = 7;

type BillingGateInput = {
  subscription?: { trialEndsAt?: Date | null; status?: string | null; stripeSubscriptionId?: string | null } | null;
  settings?: { featureFlags?: unknown } | null;
  paidInvoice?: {
    id?: string | null;
    status?: string | null;
    periodEnd?: Date | string | null;
    paidAt?: Date | string | null;
    updatedAt?: Date | string | null;
    createdAt?: Date | string | null;
    amountCents?: number | null;
  } | null;
  organizationCreatedAt?: Date | null;
  now?: Date;
};

export function computeBillingGateStatus(input: BillingGateInput) {
  const createdAt = input.organizationCreatedAt ? new Date(input.organizationCreatedAt) : new Date();
  const now = input.now ? new Date(input.now) : new Date();
  const fallbackTrialEndsAt = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const subscriptionTrialEndsAt =
    input.subscription?.status === "trialing" ? input.subscription?.trialEndsAt ?? null : null;
  const trialEndsAt = subscriptionTrialEndsAt ?? fallbackTrialEndsAt;
  const trialActive = trialEndsAt.getTime() > now.getTime();

  const flags = input.settings?.featureFlags;
  const flagsObj = flags && typeof flags === "object" && !Array.isArray(flags) ? (flags as Record<string, unknown>) : {};
  const manualActiveFlag =
    typeof flagsObj.billingSubscriptionActive === "boolean" ? flagsObj.billingSubscriptionActive : null;
  const cancelAt = parseDate(flagsObj.billingSubscriptionCancelAt ?? null);
  const cancelScheduled = Boolean(cancelAt && cancelAt.getTime() > now.getTime());
  const cancelEffective = Boolean(cancelAt && cancelAt.getTime() <= now.getTime());

  const invoiceFromDb = input.paidInvoice ?? null;
  let hasPaidInvoice = isInvoiceActive(invoiceFromDb, now);
  if (!hasPaidInvoice) {
    const fallbackInvoices = Array.isArray(flagsObj.billingInvoices) ? (flagsObj.billingInvoices as any[]) : [];
    hasPaidInvoice = fallbackInvoices.some((inv) => isInvoiceActive(inv ?? null, now));
  }
  const hasPaidHistory =
    Boolean(invoiceFromDb) ||
    Boolean(input.subscription?.stripeSubscriptionId) ||
    (Array.isArray(flagsObj.billingInvoices) &&
      (flagsObj.billingInvoices as any[]).some(
        (inv) => inv?.status === "paid" && typeof inv?.amountCents === "number" && inv.amountCents > 0
      ));

  const hasStripeSubscription =
    Boolean(input.subscription?.stripeSubscriptionId) && input.subscription?.status === "active";
  const paidAccess = hasPaidInvoice || hasStripeSubscription;
  let subscriptionActive =
    manualActiveFlag === true ? true : manualActiveFlag === false ? false : paidAccess;
  if (cancelScheduled) subscriptionActive = true;
  if (cancelEffective) subscriptionActive = false;
  const hasPaidAccess = subscriptionActive;
  const blocked = !trialActive && !hasPaidAccess;
  const blockedReason = blocked ? (hasPaidHistory ? "subscription_inactive" : "trial_expired") : null;

  return {
    trialEndsAt,
    trialActive,
    hasPaidAccess,
    blocked,
    blockedReason,
    subscriptionActive,
    cancelAt,
    cancelScheduled,
  };
}

export async function getBillingGateStatus(organizationId: string, organizationCreatedAt?: Date | null) {
  let resolvedOrgCreatedAt = organizationCreatedAt ?? null;
  if (!resolvedOrgCreatedAt) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { createdAt: true },
    });
    resolvedOrgCreatedAt = org?.createdAt ?? null;
  }
  const [subscription, settings, paidInvoice] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId },
      select: { trialEndsAt: true, status: true, stripeSubscriptionId: true },
    }),
    prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { featureFlags: true },
    }),
    prisma.invoice.findFirst({
      where: { organizationId, status: "paid", amountCents: { gt: 0 } },
      select: { id: true, status: true, periodEnd: true, updatedAt: true, createdAt: true, amountCents: true },
      orderBy: { periodEnd: "desc" },
    }),
  ]);

  return computeBillingGateStatus({
    subscription,
    settings,
    paidInvoice,
    organizationCreatedAt: resolvedOrgCreatedAt,
  });
}
