"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { revalidatePath } from "next/cache";

export type TopUpFormState = {
  status: "idle" | "ok" | "error";
  method?: "crypto" | "sbp" | "invoice";
  error?: "invalid_amount" | "invalid_method" | "forbidden";
};


export async function createTopUpRequest(
  _prevState: TopUpFormState,
  formData: FormData
): Promise<TopUpFormState> {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR"].includes(role)) {
    return { status: "error", error: "forbidden" };
  }
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) {
    return { status: "error", error: "forbidden" };
  }

  const method = String(formData.get("method") ?? "");
  const methodValue = ["crypto", "sbp", "invoice"].includes(method) ? (method as TopUpFormState["method"]) : null;
  if (!methodValue) {
    return { status: "error", error: "invalid_method" };
  }

  const amountUsd = Number(formData.get("amountUsd") ?? "0");
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { status: "error", error: "invalid_amount" };
  }

  const amountCents = Math.max(1, Math.round(amountUsd * 100));
  const networkRaw = String(formData.get("network") ?? "");
  const network =
    methodValue === "crypto" && ["ERC20", "TRC20"].includes(networkRaw)
      ? networkRaw
      : methodValue === "crypto"
        ? "ERC20"
        : null;

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: user.organizationId },
    select: { featureFlags: true },
  });
  const flags = settings?.featureFlags;
  const flagsObj = flags && typeof flags === "object" && !Array.isArray(flags) ? (flags as Record<string, unknown>) : {};
  const existing = Array.isArray(flagsObj.billingTopUpRequests) ? (flagsObj.billingTopUpRequests as any[]) : [];
  const request = {
    id: `topup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    organizationId: user.organizationId,
    createdByUserId: user.id,
    method: methodValue,
    network,
    amountCents,
    currency: "USD",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const nextFlags = {
    ...flagsObj,
    billingTopUpRequests: [...existing, request].slice(-50),
  };

  await prisma.organizationSettings.upsert({
    where: { organizationId: user.organizationId },
    create: { organizationId: user.organizationId, featureFlags: nextFlags },
    update: { featureFlags: nextFlags },
  });

  revalidatePath("/app/settings/billing");
  revalidatePath("/app/settings/billing/top-up");
  return { status: "ok", method: methodValue };
}
