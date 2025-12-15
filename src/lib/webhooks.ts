import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";
import crypto from "crypto";

export type WebhookEvent = {
  id: string;
  type: string;
  occurred_at: string;
  organization_id: string;
  data: any;
  version: string;
};

export async function enqueueWebhook(eventType: string, organizationId: string, payload: any) {
  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    type: eventType,
    occurred_at: new Date().toISOString(),
    organization_id: organizationId,
    data: payload,
    version: "v1",
  };

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId, isActive: true, eventTypes: { has: eventType } },
  });

  for (const ep of endpoints) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: ep.id,
        eventType: eventType,
        payload: event as any,
        status: "pending",
        attempt: 0,
      },
    });
    await addJob("webhookDelivery", { deliveryId: delivery.id });
  }
}

// Backward-compat alias for legacy imports
export async function triggerWebhookEvent(eventType: string, organizationId: string, payload: any) {
  return enqueueWebhook(eventType, organizationId, payload);
}

export function signPayload(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export async function processPendingWebhooks(take: number = 50) {
  const pending = await prisma.webhookDelivery.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take,
  });
  for (const delivery of pending) {
    await addJob("webhookDelivery", { deliveryId: delivery.id });
  }
}
