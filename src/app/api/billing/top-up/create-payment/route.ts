import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";
import { assertSameOrigin, requireApiUser, requireRole } from "@/lib/apiAuth";
import { getBaseUrl } from "@/lib/url";
import { createYooKassaPayment } from "@/lib/yookassa";
import { isFeatureEnabled } from "@/lib/featureFlags";

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

    const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: auth.user.organizationId, userId: auth.user.id });
    if (!enabled) {
      return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    }

    if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
      return NextResponse.json({ error: "YooKassa not configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const amountRaw = Number(body?.amount ?? NaN);
    const amount = Number.isFinite(amountRaw) ? Math.round(amountRaw * 100) / 100 : NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const internalOrderId = crypto.randomUUID();
    const baseUrl = getBaseUrl();
    const returnUrl = `${baseUrl}/billing/success?orderId=${encodeURIComponent(internalOrderId)}`;
    const currency = "RUB";
    const description = `StressSense top-up · ${amount} ${currency}`;

    await prisma.payment.create({
      data: {
        id: internalOrderId,
        userId: auth.user.id,
        organizationId: auth.user.organizationId,
        planId: "topup",
        amount,
        currency,
        status: "pending",
        provider: "yookassa",
      },
    });

    await prisma.topupRequest.create({
      data: {
        id: internalOrderId,
        userId: auth.user.id,
        amount,
        currency,
        paymentMethod: "yookassa",
        details: { source: "yookassa" },
        status: "pending",
      },
    });

    let payment;
    try {
      payment = await createYooKassaPayment(
        {
          amount: { value: toAmountValue(amount), currency },
          capture: true,
          description,
          confirmation: { type: "redirect", return_url: returnUrl },
          metadata: {
            internalOrderId,
            userId: auth.user.id,
            organizationId: auth.user.organizationId,
            purpose: "topup",
            amountCents: String(Math.round(amount * 100)),
          },
        },
        internalOrderId,
      );
    } catch (error) {
      await prisma.payment.update({
        where: { id: internalOrderId },
        data: { status: "canceled" },
      }).catch(() => null);
      await prisma.topupRequest.update({
        where: { id: internalOrderId },
        data: { status: "rejected", processedAt: new Date() },
      }).catch(() => null);
      throw error;
    }

    await prisma.payment.update({
      where: { id: internalOrderId },
      data: {
        providerPaymentId: payment.id,
        rawPayload: payment as unknown as object,
      },
    });
    await prisma.topupRequest.update({
      where: { id: internalOrderId },
      data: { details: { source: "yookassa", paymentId: payment.id } },
    });

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      return NextResponse.json({ error: "Missing confirmation URL" }, { status: 502 });
    }

    return NextResponse.json({ confirmation_url: confirmationUrl, internalOrderId });
  } catch (e) {
    console.error("Create YooKassa top-up failed", e);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
