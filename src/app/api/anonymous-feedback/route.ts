import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { createNotification } from "@/lib/notifications";
import {
  canSendAnonToLeader,
  containsPii,
  formatAnonHandle,
  isAdminLikeRole,
  isValidCategory,
  normalizeTags,
  rotationBucket,
} from "@/lib/anonymousFeedback";
import { assertSameOrigin } from "@/lib/apiAuth";

const DAILY_LIMIT = 3;

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (user.role ?? "").toUpperCase();
  const isAdminSender = isAdminLikeRole(role);
  if (!["EMPLOYEE", "MANAGER", "ADMIN", "HR", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const message = (body.message ?? "").toString().trim();
  if (!message || message.length < 10) {
    return NextResponse.json({ error: "Message is too short" }, { status: 400 });
  }
  if (containsPii(message)) {
    return NextResponse.json({ error: "PII detected" }, { status: 400 });
  }

  const category = (body.category ?? "").toString();
  if (!isValidCategory(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const rate = rateLimit(`anon-feedback:${user.id}`, { limit: DAILY_LIMIT, windowMs: 24 * 60 * 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const allowFollowup = body.allow_followup !== false;
  const teamId = body.team_id ? String(body.team_id) : null;
  let recipientLeaderId = body.recipient_leader_id ? String(body.recipient_leader_id) : null;
  let routedToAdmin = false;

  if (!recipientLeaderId) {
    return NextResponse.json({ error: "Recipient required" }, { status: 400 });
  }
  if (recipientLeaderId === user.id) {
    return NextResponse.json({ error: "Recipient not allowed" }, { status: 400 });
  }

  if (teamId) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: user.organizationId },
      include: { users: { include: { user: true } } },
    });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const isMember =
      team.users.some((tu: any) => tu.userId === user.id) ||
      Boolean(
        await prisma.member.findFirst({
          where: { teamId, organizationId: user.organizationId, userId: user.id },
          select: { id: true },
        })
      );
    if (!isAdminSender && !isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const memberCount = team.memberCount ?? 0;
    const teamSize =
      memberCount > 0
        ? memberCount
        : (await prisma.member.count({ where: { teamId, organizationId: user.organizationId } })) || team.users.length;
    void canSendAnonToLeader(teamSize);

    let recipientRecord = await prisma.user.findFirst({
      where: { id: recipientLeaderId, organizationId: user.organizationId },
      select: { id: true, role: true },
    });
    if (!recipientRecord) {
      const fallbackAdmin = await pickAdminRecipient(user.organizationId);
      if (!fallbackAdmin) {
        return NextResponse.json({ error: "No admin recipient available" }, { status: 400 });
      }
      recipientLeaderId = fallbackAdmin.id;
      routedToAdmin = true;
      recipientRecord = fallbackAdmin;
    }

    const recipientIsAdminLike = isAdminLikeRole(recipientRecord.role);
    const recipientIsInTeam =
      team.users.some((tu: any) => tu.userId === recipientLeaderId) ||
      Boolean(
        await prisma.member.findFirst({
          where: { teamId, organizationId: user.organizationId, userId: recipientLeaderId },
          select: { id: true },
        })
      );

    if (!routedToAdmin && !recipientIsInTeam && !recipientIsAdminLike) {
      const fallbackAdmin = await pickAdminRecipient(user.organizationId);
      if (!fallbackAdmin) {
        return NextResponse.json({ error: "Leader not found in team" }, { status: 400 });
      }
      recipientLeaderId = fallbackAdmin.id;
      routedToAdmin = true;
    }
  } else {
    const recipient = await prisma.user.findFirst({
      where: { id: recipientLeaderId, organizationId: user.organizationId },
      select: { role: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not allowed" }, { status: 400 });
    }
  }

  const recipient = await prisma.user.findFirst({
    where: { id: recipientLeaderId, organizationId: user.organizationId },
    select: { id: true, name: true },
  });
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  const tags = normalizeTags(body.tags);
  const bucket = rotationBucket();

  const result = await prisma.$transaction(async (tx: any) => {
    const feedback = await tx.anonymousFeedback.create({
      data: {
        orgId: user.organizationId,
        senderUserId: user.id,
        recipientLeaderId: recipient.id,
        teamId,
        category,
        tags,
        message,
        allowFollowup,
        status: "new",
      },
    });

    const existingCount = await tx.anonymousThread.count({
      where: {
        orgId: user.organizationId,
        rotationBucket: bucket,
        feedback: { recipientLeaderId: recipient.id },
      },
    });
    const anonHandle = formatAnonHandle(existingCount + 1);
    const thread = await tx.anonymousThread.create({
      data: {
        orgId: user.organizationId,
        feedbackId: feedback.id,
        anonHandle,
        rotationBucket: bucket,
      },
    });
    await tx.anonymousThreadMessage.create({
      data: {
        threadId: thread.id,
        direction: "sender_to_leader",
        body: message,
      },
    });
    return { feedback, thread };
  });

  await createNotification({
    organizationId: user.organizationId,
    userId: recipient.id,
    type: "ANON_FEEDBACK_NEW",
    title: "New anonymous feedback",
    body: `Category: ${category}`,
    link: `/app/feedback/thread/${result.thread.id}`,
  });

  return NextResponse.json({
    feedbackId: result.feedback.id,
    threadId: result.thread.id,
    routedToAdmin,
  });
}

async function pickAdminRecipient(organizationId: string) {
  const admins = await prisma.user.findMany({
    where: { organizationId, role: { in: ["HR", "ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, role: true },
  });
  if (!admins.length) return null;
  const priority = { HR: 0, ADMIN: 1, SUPER_ADMIN: 2 } as const;
  return admins.sort((a: any, b: any) => (priority[a.role as keyof typeof priority] ?? 9) - (priority[b.role as keyof typeof priority] ?? 9))[0];
}
