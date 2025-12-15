import { prisma } from "@/lib/prisma";

export async function syncOrgToCRM(organizationId: string) {
  const mapping = await prisma.orgCRMMapping.findFirst({
    where: { organizationId },
    include: { crmIntegration: true, organization: true },
  });
  if (!mapping) return;
  // Placeholder: push org fields to CRM via mapping.crmIntegration
  // Implement provider-specific calls elsewhere.
  await prisma.auditLog.create({
    data: {
      organizationId,
      action: "CRM_SYNC",
      targetType: "ORGANIZATION",
      targetId: organizationId,
    },
  });
}

export async function recordLifecycleEvent(organizationId: string, eventType: string, payload?: any) {
  await prisma.auditLog.create({
    data: {
      organizationId,
      action: "LIFECYCLE_EVENT",
      targetType: "ORGANIZATION",
      targetId: organizationId,
      metadata: { eventType, payload },
    },
  });
  // could enqueue crm sync
}
