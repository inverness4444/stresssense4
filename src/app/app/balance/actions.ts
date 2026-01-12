"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { BASE_CURRENCY, PAYMENT_METHODS } from "@/config/payments";

export type TopupFormState = {
  status: "idle" | "ok" | "error";
  error?: "invalid_amount" | "invalid_method" | "unauthorized";
};

export async function createTopupRequest(
  _prevState: TopupFormState,
  formData: FormData
): Promise<TopupFormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", error: "unauthorized" };

  const amount = Number(formData.get("amount") ?? "0");
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "error", error: "invalid_amount" };
  }

  const methodRaw = String(formData.get("method") ?? "").toLowerCase();
  if (!PAYMENT_METHODS.includes(methodRaw as (typeof PAYMENT_METHODS)[number])) {
    return { status: "error", error: "invalid_method" };
  }

  const comment = String(formData.get("comment") ?? "").trim();
  const network = String(formData.get("network") ?? "").toUpperCase();
  const details: Record<string, string> = {};
  if (comment) details.comment = comment;
  if (methodRaw === "crypto" && network) details.network = network;

  const currency = methodRaw === "crypto" ? "USDT" : BASE_CURRENCY;

  await prisma.topupRequest.create({
    data: {
      userId: user.id,
      amount,
      currency,
      paymentMethod: methodRaw,
      details: Object.keys(details).length ? details : undefined,
      status: "pending",
    },
  });

  revalidatePath("/app/balance");
  revalidatePath("/app/settings/billing");
  return { status: "ok" };
}
