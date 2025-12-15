import { prisma } from "@/lib/prisma";

export async function runHrisSync(connectionId: string) {
  // placeholder: mark log success; real integration should call provider API.
  const log = await prisma.hRISSyncLog.create({
    data: {
      hrisConnectionId: connectionId,
      status: "running",
      employeesFetched: 0,
    },
  });
  await prisma.hRISSyncLog.update({
    where: { id: log.id },
    data: { status: "success", finishedAt: new Date() },
  });
}
