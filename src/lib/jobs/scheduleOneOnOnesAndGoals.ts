import { prisma } from "@/lib/prisma";

function addDays(base: Date, days: number) {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

export async function scheduleOneOnOnesAndGoals() {
  const now = new Date();
  // One-on-ones: if nextPlannedAt missing or in past -> schedule new meeting
  const relationships = await prisma.oneOnOneRelationship.findMany({
    where: { isActive: true },
    include: { organization: true },
  });
  for (const rel of relationships) {
    if (!rel.cadenceDays && !rel.templateId) continue;
    const cadence = rel.cadenceDays ?? 14;
    const needsMeeting = !rel.nextPlannedAt || rel.nextPlannedAt < now;
    if (needsMeeting) {
      const scheduledAt = addDays(now, 3); // simple heuristic: 3 days later
      await prisma.oneOnOneMeeting.create({
        data: {
          organizationId: rel.organizationId,
          relationshipId: rel.id,
          scheduledAt,
          status: "scheduled",
        },
      });
      await prisma.oneOnOneRelationship.update({
        where: { id: rel.id },
        data: { nextPlannedAt: addDays(scheduledAt, cadence) },
      });
    }
  }

  // Goals: create action items for stale check-ins
  const goals = await prisma.goal.findMany({
    where: { status: "active", dueDate: { not: null } },
    include: { checkins: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const today = new Date();
  for (const goal of goals) {
    const lastCheckin = goal.checkins[0]?.createdAt;
    const stale = !lastCheckin || addDays(lastCheckin, 14) < today;
    if (stale) {
      const existing = await prisma.actionCenterItem.findFirst({
        where: {
          organizationId: goal.organizationId,
          userId: goal.ownerUserId,
          type: "goal_checkin_due",
          status: { in: ["open", "in_progress"] },
          sourceRef: goal.id,
        },
      });
      if (!existing) {
        await prisma.actionCenterItem.create({
          data: {
            organizationId: goal.organizationId,
            userId: goal.ownerUserId,
            type: "goal_checkin_due",
            title: `Обновите прогресс цели: ${goal.title}`,
            description: "Давно не было чека по цели. Обновите статус.",
            severity: "medium",
            status: "open",
            dueAt: today,
            sourceRef: goal.id,
          },
        });
      }
    }
  }
}
