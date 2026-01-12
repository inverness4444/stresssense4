"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { revalidatePath } from "next/cache";
import { BASE_CURRENCY } from "@/config/payments";

export type TopUpFormState = {
  status: "idle" | "ok" | "error";
  method?: "crypto" | "sbp" | "other";
  error?: "invalid_amount" | "invalid_method" | "forbidden";
};


export async function createTopUpRequest(
  _prevState: TopUpFormState,
  formData: FormData
): Promise<TopUpFormState> {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) {
    return { status: "error", error: "forbidden" };
  }
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) {
    return { status: "error", error: "forbidden" };
  }

  const method = String(formData.get("method") ?? "");
  const methodValue = ["crypto", "sbp", "other"].includes(method) ? (method as TopUpFormState["method"]) : null;
  if (!methodValue) {
    return { status: "error", error: "invalid_method" };
  }

  const amount = Number(formData.get("amount") ?? "0");
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "error", error: "invalid_amount" };
  }

  const networkRaw = String(formData.get("network") ?? "");
  const network =
    methodValue === "crypto" && ["ERC20", "TRC20"].includes(networkRaw)
      ? networkRaw
      : methodValue === "crypto"
        ? "ERC20"
        : null;
  const details: Record<string, string> = {};
  if (network) details.network = network;

  const currency = methodValue === "crypto" ? "USDT" : BASE_CURRENCY;

  await prisma.topupRequest.create({
    data: {
      userId: user.id,
      amount,
      currency,
      paymentMethod: methodValue,
      details: Object.keys(details).length ? details : undefined,
      status: "pending",
    },
  });

  revalidatePath("/app/settings/billing");
  revalidatePath("/app/settings/billing/top-up");
  return { status: "ok", method: methodValue };
}
