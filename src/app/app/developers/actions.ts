'use server';

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/apiKeys";

export async function createApiKeyAction(input: { name: string; scopes: string[] }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };
  if (!input.name || !input.scopes?.length) return { error: "Name and scopes are required" };
  const { token } = await generateApiKey({
    organizationId: user.organizationId,
    name: input.name,
    scopes: input.scopes,
    createdById: user.id,
  });
  revalidatePath("/app/developers");
  return { token };
}

export async function revokeApiKeyAction(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };
  await prisma.apiKey.updateMany({
    where: { id, organizationId: user.organizationId },
    data: { isActive: false },
  });
  revalidatePath("/app/developers");
  return { success: true };
}

export async function createWebhookEndpointAction(input: { url: string; description?: string; eventTypes: string[] }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };
  if (!input.url || !input.eventTypes?.length) return { error: "URL and events are required" };
  const secret = randomBytes(24).toString("hex");
  await prisma.webhookEndpoint.create({
    data: {
      organizationId: user.organizationId,
      url: input.url,
      description: input.description ?? null,
      eventTypes: input.eventTypes,
      secret,
    },
  });
  revalidatePath("/app/developers");
  return { secret };
}

export async function deactivateWebhookAction(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };
  await prisma.webhookEndpoint.updateMany({
    where: { id, organizationId: user.organizationId },
    data: { isActive: false },
  });
  revalidatePath("/app/developers");
  return { success: true };
}

export async function updateEmbedConfigAction(input: { allowedOrigins: string; regenerate?: boolean }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };
  const origins = input.allowedOrigins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const publicKey = input.regenerate ? randomBytes(16).toString("hex") : undefined;
  const existing = await prisma.embedConfig.findUnique({ where: { organizationId: user.organizationId } });
  if (existing) {
    await prisma.embedConfig.update({
      where: { organizationId: user.organizationId },
      data: {
        allowedOrigins: origins,
        ...(publicKey ? { publicKey } : {}),
      },
    });
  } else {
    await prisma.embedConfig.create({
      data: {
        organizationId: user.organizationId,
        allowedOrigins: origins,
        publicKey: publicKey ?? randomBytes(16).toString("hex"),
      },
    });
  }
  revalidatePath("/app/developers");
  return { success: true, publicKey: publicKey ?? existing?.publicKey };
}
