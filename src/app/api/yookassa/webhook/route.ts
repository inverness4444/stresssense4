import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYooKassaPayment } from "@/lib/yookassa";
import { applyWalletTransaction } from "@/lib/wallet";

export const runtime = "nodejs";

function toCents(value: string | undefined | null) {
  const num = Number(value ?? NaN);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

function normalizeStatus(status: string | undefined | null) {
  if (status === "succeeded") return "succeeded";
  if (status === "canceled") return "canceled";
  return "pending";
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);
    const object = payload?.object ?? null;
    const paymentId = typeof object?.id === "string" ? object.id : null;
    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    const payment = await fetchYooKassaPayment(paymentId);
    const metadata = payment.metadata ?? {};
    const internalOrderId = typeof metadata.internalOrderId === "string" ? metadata.internalOrderId : null;
    if (!internalOrderId) {
      return NextResponse.json({ ok: true });
    }

    const record = await prisma.payment.findUnique({ where: { id: internalOrderId } });
    if (!record) {
      return NextResponse.json({ ok: true });
    }

    const isTopUp = record.planId === "topup";
    const providerStatus = normalizeStatus(payment.status);
    if (payment.status === "waiting_for_capture") {
      return NextResponse.json({ ok: true });
    }

    const amountCents = toCents(payment.amount?.value);
    const expectedCents = Math.round(Number(record.amount ?? 0) * 100);
    const currency = payment.amount?.currency ?? "RUB";
    if (!amountCents || currency !== record.currency || Math.abs(amountCents - expectedCents) > 1) {
      console.error("YooKassa payment mismatch", { internalOrderId, paymentId });
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (record.status === providerStatus || record.status === "succeeded") {
      return NextResponse.json({ ok: true });
    }

    if (isTopUp) {
      if (providerStatus === "succeeded") {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: internalOrderId },
            data: {
              status: providerStatus,
              providerPaymentId: payment.id,
              rawPayload: payment as unknown as object,
            },
          });
          await tx.topupRequest.update({
            where: { id: internalOrderId },
            data: { status: "approved", processedAt: new Date() },
          }).catch(() => null);
          await applyWalletTransaction(
            {
              userId: record.userId,
              amount: Number(record.amount ?? 0),
              type: "manual_deposit",
              currency: record.currency ?? "RUB",
              comment: `Top-up ${internalOrderId}`,
              createdByAdminId: null,
            },
            tx as typeof prisma,
          );
        });
        return NextResponse.json({ ok: true });
      }

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: internalOrderId },
          data: {
            status: providerStatus,
            providerPaymentId: payment.id,
            rawPayload: payment as unknown as object,
          },
        });
        if (providerStatus === "canceled") {
          await tx.topupRequest.update({
            where: { id: internalOrderId },
            data: { status: "rejected", processedAt: new Date() },
          }).catch(() => null);
        }
      });
      return NextResponse.json({ ok: true });
    }

    await prisma.payment.update({
      where: { id: internalOrderId },
      data: {
        status: providerStatus,
        providerPaymentId: payment.id,
        rawPayload: payment as unknown as object,
      },
    });

    if (providerStatus !== "succeeded") {
      return NextResponse.json({ ok: true });
    }

    const orgId = record.organizationId;
    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: { featureFlags: true },
    });
    const flags = settings?.featureFlags;
    const flagsObj = flags && typeof flags === "object" && !Array.isArray(flags) ? (flags as Record<string, unknown>) : {};
    const pendingSeats = typeof flagsObj.billingPendingSeats === "number" ? flagsObj.billingPendingSeats : null;
    const pendingInvoiceId = typeof flagsObj.billingPendingInvoiceId === "string" ? flagsObj.billingPendingInvoiceId : null;
    const nextFlags: Record<string, unknown> = {
      ...flagsObj,
      billingSubscriptionActive: true,
    };
    delete nextFlags.billingSubscriptionCancelAt;
    if (pendingSeats != null) {
      let seatsApplied = false;
      try {
        const updateResult = await prisma.subscription.updateMany({
          where: { organizationId: orgId },
          data: { seats: pendingSeats },
        });
        seatsApplied = Boolean(updateResult && typeof (updateResult as any).count === "number" && (updateResult as any).count > 0);
      } catch {
        seatsApplied = false;
      }

      if (!seatsApplied) {
        nextFlags.billingSeats = pendingSeats;
      }
      delete nextFlags.billingPendingSeats;
      delete nextFlags.billingPendingInvoiceId;
      delete nextFlags.billingPendingAmountCents;
    }

    const invoiceId =
      (typeof metadata.invoiceId === "string" && metadata.invoiceId) ? metadata.invoiceId : pendingInvoiceId;
    if (invoiceId) {
      try {
        await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "paid" } });
      } catch {
        // ignore if invoice table isn't available
      }
      if (Array.isArray(nextFlags.billingInvoices)) {
        nextFlags.billingInvoices = (nextFlags.billingInvoices as any[]).map((inv) => {
          if (inv?.id === invoiceId && inv?.status === "open") {
            return { ...inv, status: "paid", paidAt: new Date().toISOString() };
          }
          return inv;
        });
      }
    }

    await prisma.organizationSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, featureFlags: nextFlags },
      update: { featureFlags: nextFlags },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("YooKassa webhook failed", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
