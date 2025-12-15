import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";

export async function trackProductEvent(input: {
  eventName: string;
  source: string;
  properties?: Record<string, any>;
  sessionId?: string;
}) {
  const user = await getCurrentUser();
  await prisma.productEvent.create({
    data: {
      eventName: input.eventName,
      source: input.source,
      properties: input.properties ?? {},
      sessionId: input.sessionId,
      userId: user?.id,
      organizationId: user?.organizationId,
    },
  });
}
