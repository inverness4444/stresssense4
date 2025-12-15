'use server';

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { runHrisSync } from "@/lib/hrisSync";

export async function connectHRIS(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/signin");
  const organizationId = formData.get("organizationId") as string;
  if (organizationId !== user.organizationId) redirect("/signin");
  const provider = (formData.get("provider") as string) ?? "generic";
  const apiBaseUrl = (formData.get("apiBaseUrl") as string) || null;
  const apiKey = (formData.get("apiKey") as string) || null;
  await prisma.hRISIntegration.upsert({
    where: { organizationId },
    update: { provider, apiBaseUrl, apiKey, subdomain: apiBaseUrl },
    create: { organizationId, provider, apiBaseUrl, apiKey, subdomain: apiBaseUrl },
  });
  redirect("/app/integrations");
}

export async function runHRISSync(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/signin");
  const organizationId = formData.get("organizationId") as string;
  if (organizationId !== user.organizationId) redirect("/signin");
  const connection = await prisma.hRISIntegration.findUnique({ where: { organizationId } });
  if (connection) {
    await runHrisSync(connection.id);
  }
  redirect("/app/integrations");
}
