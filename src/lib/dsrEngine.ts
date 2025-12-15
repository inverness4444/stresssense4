import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";

export type DsrType = "ACCESS" | "ERASURE" | "RECTIFICATION" | "RESTRICT" | "PORTABILITY";

export async function createDSR(params: { organizationId: string; userId?: string; email: string; type: DsrType; reason?: string }) {
  const request = await prisma.dataSubjectRequest.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      email: params.email,
      type: params.type,
      reason: params.reason,
    },
  });

  if (params.type === "ACCESS" || params.type === "PORTABILITY") {
    await addJob("dsr_export", { requestId: request.id });
  }
  if (params.type === "ERASURE") {
    await addJob("dsr_erasure", { requestId: request.id });
  }

  return request;
}

export async function collectUserDataForExport(orgId: string, userId?: string, email?: string) {
  // Minimal placeholder to avoid breaking build; real implementation should gather data across tables.
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  return {
    user,
    email,
    surveys: [],
    coach: [],
    academy: [],
    community: [],
  };
}

export async function performErasure(orgId: string, userId?: string, email?: string) {
  // Placeholder: mark user as deleted and nullify PII. Real logic should cover all related entities.
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true, deletedAt: new Date(), email: `deleted-${userId}@example.com`, name: "Deleted user" },
    });
  }
}
