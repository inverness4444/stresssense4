"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertSuperAdmin } from "@/lib/superAdmin";
import { applyWalletTransaction } from "@/lib/wallet";
import { BASE_CURRENCY, USD_TO_RUB_RATE } from "@/config/payments";

const EDITABLE_ROLES = ["HR", "ADMIN", "MANAGER", "EMPLOYEE"] as const;
const BALANCE_TYPES = ["manual_deposit", "manual_withdraw", "adjustment"] as const;

export async function updateUserRole(formData: FormData) {
  const admin = await assertSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "").toUpperCase();

  if (!userId || !EDITABLE_ROLES.includes(role as (typeof EDITABLE_ROLES)[number])) {
    throw new Error("Invalid role");
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) throw new Error("User not found");
  if ((target.role ?? "").toUpperCase() === "SUPER_ADMIN") {
    throw new Error("Cannot change super admin role");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function adjustUserBalance(formData: FormData) {
  const admin = await assertSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const type = String(formData.get("type") ?? "") as (typeof BALANCE_TYPES)[number];
  const amount = Number(formData.get("amount") ?? "0");
  const comment = String(formData.get("comment") ?? "").trim();

  if (!userId || !BALANCE_TYPES.includes(type)) {
    throw new Error("Invalid request");
  }
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Invalid amount");
  }

  await applyWalletTransaction({
    userId,
    amount,
    type,
    currency: BASE_CURRENCY,
    comment: comment || null,
    createdByAdminId: admin.id,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/transactions");
  revalidatePath("/app/settings/billing");
  revalidatePath("/app/balance");
  return { ok: true };
}

export async function approveTopupRequest(formData: FormData) {
  const admin = await assertSuperAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) throw new Error("Invalid request");

  await prisma.$transaction(async (tx) => {
    const request = await tx.topupRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, userId: true, amount: true, currency: true },
    });
    if (!request) throw new Error("Not found");
    if (request.status !== "pending") throw new Error("Already processed");

    await tx.topupRequest.update({
      where: { id: request.id },
      data: {
        status: "approved",
        processedByAdminId: admin.id,
        processedAt: new Date(),
      },
    });

    const requestCurrency = String(request.currency ?? BASE_CURRENCY).toUpperCase();
    const baseCurrency = BASE_CURRENCY.toUpperCase();
    const amountValue = Number(request.amount ?? 0);
    let normalizedAmount = amountValue;
    let conversionNote = "";
    if (requestCurrency !== baseCurrency) {
      const rate =
        requestCurrency === "USD" && baseCurrency === "RUB"
          ? USD_TO_RUB_RATE
          : 1;
      normalizedAmount = amountValue * rate;
      conversionNote = rate !== 1 ? ` (${requestCurrency}→${baseCurrency} x${rate})` : "";
    }

    await applyWalletTransaction(
      {
        userId: request.userId,
        amount: normalizedAmount,
        type: "manual_deposit",
        currency: BASE_CURRENCY,
        comment: `Top-up request approved${conversionNote}`,
        createdByAdminId: admin.id,
      },
      tx as typeof prisma
    );
  });

  revalidatePath("/admin/topups");
  revalidatePath(`/admin/topups/${requestId}`);
  revalidatePath("/admin/transactions");
  revalidatePath("/app/settings/billing");
  revalidatePath("/app/balance");
  return { ok: true };
}

export async function rejectTopupRequest(formData: FormData) {
  const admin = await assertSuperAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) throw new Error("Invalid request");

  const request = await prisma.topupRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
  });
  if (!request) throw new Error("Not found");
  if (request.status !== "pending") throw new Error("Already processed");

  await prisma.topupRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      processedByAdminId: admin.id,
      processedAt: new Date(),
    },
  });

  revalidatePath("/admin/topups");
  revalidatePath(`/admin/topups/${requestId}`);
  revalidatePath("/app/balance");
  return { ok: true };
}
