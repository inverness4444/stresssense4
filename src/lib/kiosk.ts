import { prisma } from "./prisma";

export async function getKioskSession(id: string) {
  return prisma.kioskSession.findUnique({
    where: { id },
    include: { survey: { include: { questions: true } }, organization: true },
  });
}

export async function ensureKioskUser(organizationId: string) {
  let user = await prisma.user.findFirst({
    where: { organizationId, email: "kiosk@" + organizationId },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        organizationId,
        email: "kiosk@" + organizationId,
        name: "Kiosk",
        passwordHash: "kiosk",
        role: "EMPLOYEE",
      },
    });
  }
  return user;
}
