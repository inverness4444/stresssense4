import { prisma } from "@/lib/prisma";

export async function getOneOnOneOverviewForManager(params: { orgId: string; managerId: string }) {
  if (!(prisma as any).oneOnOneRelationship || !(prisma as any).oneOnOneMeeting) {
    return { relationships: [], upcomingMeetings: [], overdueMeetings: [] };
  }
  const relationships =
    (await (prisma as any).oneOnOneRelationship.findMany({
      where: { organizationId: params.orgId, managerId: params.managerId, isActive: true },
      include: { employee: true, team: true, meetings: { orderBy: { scheduledAt: "asc" }, take: 5 } },
    })) ?? [];
  const upcomingMeetings =
    (await (prisma as any).oneOnOneMeeting.findMany({
      where: { organizationId: params.orgId, status: "scheduled", relationship: { managerId: params.managerId } },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    })) ?? [];
  const overdueMeetings =
    (await (prisma as any).oneOnOneMeeting.findMany({
      where: {
        organizationId: params.orgId,
        status: { not: "completed" },
        scheduledAt: { lt: new Date() },
        relationship: { managerId: params.managerId },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    })) ?? [];
  return { relationships, upcomingMeetings, overdueMeetings };
}

export async function getOneOnOneOverviewForEmployee(params: { orgId: string; userId: string }) {
  // Safeguard if 1:1 models are not available in client (e.g., stale generation)
  if (!(prisma as any).oneOnOneRelationship || !(prisma as any).oneOnOneMeeting) {
    return { relationships: [], upcomingMeetings: [], overdueMeetings: [] };
  }

  const relationships =
    (await (prisma as any).oneOnOneRelationship.findMany({
      where: { organizationId: params.orgId, employeeId: params.userId, isActive: true },
      include: { manager: true, meetings: { orderBy: { scheduledAt: "desc" }, take: 5 } },
    })) ?? [];
  const upcomingMeetings =
    (await (prisma as any).oneOnOneMeeting.findMany({
      where: { organizationId: params.orgId, status: "scheduled", relationship: { employeeId: params.userId } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    })) ?? [];
  const overdueMeetings =
    (await (prisma as any).oneOnOneMeeting.findMany({
      where: {
        organizationId: params.orgId,
        status: { not: "completed" },
        scheduledAt: { lt: new Date() },
        relationship: { employeeId: params.userId },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    })) ?? [];
  return { relationships, upcomingMeetings, overdueMeetings };
}

export async function getGoalsOverviewForUser(params: { orgId: string; userId: string }) {
  const activeGoals = await prisma.goal.findMany({
    where: { organizationId: params.orgId, ownerUserId: params.userId, status: "active" },
    include: { checkins: { orderBy: { createdAt: "desc" }, take: 3 } },
  });
  const completedGoals = await prisma.goal.findMany({
    where: { organizationId: params.orgId, ownerUserId: params.userId, status: "completed" },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { checkins: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const recentCheckins = await prisma.goalCheckin.findMany({
    where: { createdById: params.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { goal: true },
  });
  return { activeGoals, completedGoals, recentCheckins };
}

export async function getFeedbackAndRecognitionOverview(params: { orgId: string; userId: string }) {
  const feedbackAboutMe = await prisma.feedbackResponse.findMany({
    where: { organizationId: params.orgId, request: { targetUserId: params.userId } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { request: true, responder: true },
  });
  const feedbackIRequested = await prisma.feedbackRequest.findMany({
    where: { organizationId: params.orgId, requesterId: params.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { responses: true, targetUser: true },
  });
  const recognitionsReceived = await prisma.recognition.findMany({
    where: { organizationId: params.orgId, toUserId: params.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { fromUser: true, team: true },
  });
  const recognitionsGiven = await prisma.recognition.findMany({
    where: { organizationId: params.orgId, fromUserId: params.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { toUser: true, team: true },
  });
  return { feedbackAboutMe, feedbackIRequested, recognitionsReceived, recognitionsGiven };
}
