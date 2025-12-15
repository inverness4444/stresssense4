import { prisma } from "@/lib/prisma";

export async function getEffectiveRetention(orgId: string, dataType: string) {
  const policy = await prisma.retentionPolicy.findFirst({ where: { organizationId: orgId, dataType } });
  return policy ?? null;
}

export async function purgeExpiredData() {
  // Placeholder: in production iterate orgs/dataTypes and delete/anonimize per policy and legal holds.
  return;
}
