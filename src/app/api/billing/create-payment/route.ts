import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";
import { assertSameOrigin, requireApiUser, requireRole } from "@/lib/apiAuth";
import { getBaseUrl } from "@/lib/url";
import { MIN_SEATS, normalizeSeats } from "@/config/pricing";
import { DEFAULT_PLAN_ID, calculatePlanPrice, getPlanById } from "@/lib/pricingTiers";
import { createYooKassaPayment } from "@/lib/yookassa";

export const runtime = "nodejs";

function toAmountValue(amount: number) {
  return amount.toFixed(2);
}

export async function POST(req: Request) {
  try {
    const originError = assertSameOrigin(req);
    if (originError) return originError;

    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;
    const roleError = requireRole(auth.user, ["ADMIN", "HR", "SUPER_ADMIN"]);
    if (roleError) return roleError;

    if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
      return NextResponse.json({ error: "YooKassa not configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const planIdRaw = typeof body?.planId === "string" ? body.planId : DEFAULT_PLAN_ID;
    const requestedSeatsRaw = Number(body?.seats ?? NaN);
    const plan = getPlanById(planIdRaw) ?? getPlanById(DEFAULT_PLAN_ID);
    if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const orgId = auth.user.organizationId;
    const userId = auth.user.id;

    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: { featureFlags: true },
    });
    const flags = settings?.featureFlags;
    const flagsObj = flags && typeof flags === "object" && !Array.isArray(flags) ? (flags as Record<string, unknown>) : {};
    const pendingSeats = typeof flagsObj.billingPendingSeats === "number" ? flagsObj.billingPendingSeats : null;
    const pendingInvoiceId = typeof flagsObj.billingPendingInvoiceId === "string" ? flagsObj.billingPendingInvoiceId : null;
    const pendingAmountCents = typeof flagsObj.billingPendingAmountCents === "number" ? flagsObj.billingPendingAmountCents : null;

    let seatsUsed = 0;
    try {
      seatsUsed = await prisma.user.count({ where: { organizationId: orgId, isDeleted: false } });
    } catch {
      seatsUsed = await prisma.user.count({ where: { organizationId: orgId } });
    }

    const requestedSeats = Number.isFinite(requestedSeatsRaw) ? normalizeSeats(requestedSeatsRaw) : null;
    let seats = pendingSeats ?? requestedSeats ?? Math.max(seatsUsed, MIN_SEATS);
    if (seats < seatsUsed) seats = seatsUsed;

    const priceTotal =
      typeof pendingAmountCents === "number" && pendingAmountCents > 0
        ? pendingAmountCents / 100
        : calculatePlanPrice(plan, seats)?.total ?? null;

    if (!Number.isFinite(priceTotal) || (priceTotal as number) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const internalOrderId = crypto.randomUUID();
    const baseUrl = getBaseUrl();
    const returnUrl = `${baseUrl}/billing/success?orderId=${encodeURIComponent(internalOrderId)}`;
    const description = `StressSense subscription · ${seats} seats`;
    const currency = "RUB";

    await prisma.payment.create({
      data: {
        id: internalOrderId,
        userId,
        organizationId: orgId,
        planId: plan.id,
        amount: Number(priceTotal),
        currency,
        status: "pending",
        provider: "yookassa",
      },
    });

    const metadata: Record<string, string> = {
      internalOrderId,
      userId,
      organizationId: orgId,
      planId: plan.id,
      seats: String(seats),
    };
    if (pendingInvoiceId) metadata.invoiceId = pendingInvoiceId;
    if (typeof pendingAmountCents === "number") metadata.amountCents = String(pendingAmountCents);

    let payment;
    try {
      payment = await createYooKassaPayment(
        {
          amount: { value: toAmountValue(Number(priceTotal)), currency },
          capture: true,
          description,
          confirmation: { type: "redirect", return_url: returnUrl },
          metadata,
        },
        internalOrderId,
      );
    } catch (error) {
      await prisma.payment.update({
        where: { id: internalOrderId },
        data: { status: "canceled" },
      }).catch(() => null);
      throw error;
    }

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      return NextResponse.json({ error: "Missing confirmation URL" }, { status: 502 });
    }

    await prisma.payment.update({
      where: { id: internalOrderId },
      data: {
        providerPaymentId: payment.id,
        rawPayload: payment as unknown as object,
      },
    });

    return NextResponse.json({ confirmation_url: confirmationUrl, internalOrderId });
  } catch (e) {
    console.error("Create YooKassa payment failed", e);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
