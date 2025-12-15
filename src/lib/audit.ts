import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type AuditInput = {
  organizationId: string;
  userId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function logAuditEvent(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (e) {
    console.warn("Failed to write audit log", e);
  }
}
