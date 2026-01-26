import "server-only";
import { env } from "@/config/env";

const API_BASE = "https://api.yookassa.ru/v3";

type YooKassaAmount = {
  value: string;
  currency: string;
};

type YooKassaConfirmation = {
  type: "redirect";
  confirmation_url?: string;
  return_url?: string;
};

export type YooKassaPayment = {
  id: string;
  status: string;
  amount: YooKassaAmount;
  confirmation?: YooKassaConfirmation;
  description?: string;
  metadata?: Record<string, string>;
};

export type YooKassaCreatePaymentRequest = {
  amount: YooKassaAmount;
  capture: boolean;
  description: string;
  confirmation: YooKassaConfirmation;
  metadata?: Record<string, string>;
};

function requireYooKassaConfig() {
  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
    throw new Error("YooKassa not configured");
  }
  return { shopId: env.YOOKASSA_SHOP_ID, secretKey: env.YOOKASSA_SECRET_KEY };
}

function getAuthHeader() {
  const { shopId, secretKey } = requireYooKassaConfig();
  const encoded = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
  return `Basic ${encoded}`;
}

async function yookassaRequest(path: string, init: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const status = res.status;
    const errorMessage = data?.description || data?.message || "YooKassa request failed";
    throw new Error(`${errorMessage} (status ${status})`);
  }
  return data as YooKassaPayment;
}

export async function createYooKassaPayment(
  payload: YooKassaCreatePaymentRequest,
  idempotenceKey: string,
) {
  return yookassaRequest("/payments", {
    method: "POST",
    headers: {
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchYooKassaPayment(paymentId: string) {
  return yookassaRequest(`/payments/${paymentId}`, {
    method: "GET",
  });
}
