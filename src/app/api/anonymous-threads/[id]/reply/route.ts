import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { assertSameOrigin } from "@/lib/apiAuth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const thread = await prisma.anonymousThread.findUnique({
    where: { id },
    include: { feedback: true },
  });
  if (!thread || thread.orgId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = (user.role ?? "").toUpperCase();
  const isLeader = thread.feedback.recipientLeaderId === user.id;
  const isSender = thread.feedback.senderUserId === user.id;
  if (!isLeader && !isSender) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!thread.feedback.allowFollowup) {
    return NextResponse.json({ error: "Follow-up disabled" }, { status: 400 });
  }
  if (thread.feedback.status === "resolved") {
    return NextResponse.json({ error: "Thread resolved" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const reply = (body?.body ?? "").toString().trim();
  if (!reply || reply.length < 3) {
    return NextResponse.json({ error: "Reply too short" }, { status: 400 });
  }

  const direction = isSender ? "sender_to_leader" : "leader_to_sender";
  await prisma.$transaction(async (tx: any) => {
    await tx.anonymousThreadMessage.create({
      data: {
        threadId: thread.id,
        direction,
        body: reply,
      },
    });
    await tx.anonymousFeedback.update({
      where: { id: thread.feedbackId },
      data: { status: isSender ? "new" : "in_progress" },
    });
  });

  if (isSender) {
    await createNotification({
      organizationId: thread.orgId,
      userId: thread.feedback.recipientLeaderId,
      type: "ANON_FEEDBACK_REPLY",
      title: "Anonymous feedback reply",
      body: "You have a new reply from the sender.",
      link: `/app/feedback/thread/${thread.id}`,
    });
  } else {
    await createNotification({
      organizationId: thread.orgId,
      userId: thread.feedback.senderUserId,
      type: "ANON_FEEDBACK_REPLY",
      title: "Anonymous feedback reply",
      body: "You have a new reply from a recipient.",
      link: `/app/feedback/thread/${thread.id}`,
    });
  }

  return NextResponse.json({ success: true });
}
