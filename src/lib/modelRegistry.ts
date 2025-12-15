import { prisma } from "@/lib/prisma";

export async function getActiveModel(key: string) {
  return prisma.modelVersion.findFirst({
    where: { registry: { key }, status: "active" },
    include: { registry: true },
  });
}

export async function getShadowModels(key: string) {
  return prisma.modelVersion.findMany({
    where: { registry: { key }, status: "shadow" },
    include: { registry: true },
  });
}
