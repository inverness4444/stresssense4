import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { isAdminLikeRole, sanitizeThreadForLeader } from "@/lib/anonymousFeedback";
import ThreadClient, { type ThreadPayload } from "./ThreadClient";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

export default async function FeedbackThreadPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const userOrgId = user.organizationId ?? user.organization?.id;

  const resolvedParams = await Promise.resolve(params);
  const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id;
  const threadId = typeof rawId === "string" ? decodeURIComponent(rawId) : "";
  if (!threadId) notFound();

  let thread = await prisma.anonymousThread.findUnique({
    where: { id: threadId },
    include: {
      feedback: {
        include: {
          team: { select: { id: true, name: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!thread) {
    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT
          t.id,
          t.org_id AS "orgId",
          t.feedback_id AS "feedbackId",
          t.anon_handle AS "anonHandle",
          t.rotation_bucket AS "rotationBucket",
          t.created_at AS "createdAt",
          f.id AS "feedback_id",
          f.org_id AS "feedback_org_id",
          f.sender_user_id AS "sender_user_id",
          f.recipient_leader_id AS "recipient_leader_id",
          f.team_id AS "team_id",
          f.category,
          f.tags,
          f.message,
          f.allow_followup AS "allow_followup",
          f.status,
          f.created_at AS "feedback_created_at",
          tm.id AS "team_id_ref",
          tm.name AS "team_name"
        FROM anonymous_threads t
        JOIN anonymous_feedback f ON f.id = t.feedback_id
        LEFT JOIN "Team" tm ON tm.id = f.team_id
        WHERE t.id = ${threadId}
        LIMIT 1
      `;
      if (rows?.length) {
        const row = rows[0];
        const messages = await prisma.$queryRaw<any[]>`
          SELECT id, thread_id AS "threadId", direction, body, created_at AS "createdAt"
          FROM anonymous_thread_messages
          WHERE thread_id = ${threadId}
          ORDER BY created_at ASC
        `;
        thread = {
          id: row.id,
          orgId: row.orgId,
          feedbackId: row.feedbackId,
          anonHandle: row.anonHandle,
          rotationBucket: row.rotationBucket,
          createdAt: row.createdAt,
          feedback: {
            id: row.feedback_id,
            orgId: row.feedback_org_id,
            senderUserId: row.sender_user_id,
            recipientLeaderId: row.recipient_leader_id,
            teamId: row.team_id,
            category: row.category,
            tags: row.tags,
            message: row.message,
            allowFollowup: row.allow_followup,
            status: row.status,
            createdAt: row.feedback_created_at,
            team: row.team_id_ref ? { id: row.team_id_ref, name: row.team_name } : null,
          },
          messages: (messages ?? []).map((msg) => ({
            id: msg.id,
            threadId: msg.threadId,
            direction: msg.direction,
            body: msg.body,
            createdAt: msg.createdAt,
          })),
        };
      }
    } catch {
      // fall back to notFound below
    }
  }

  if (!thread) {
    const fallbackFeedback = await prisma.anonymousFeedback.findUnique({
      where: { id: threadId },
      select: { thread: { select: { id: true } } },
    });
    if (fallbackFeedback?.thread?.id) {
      redirect(`/app/feedback/thread/${fallbackFeedback.thread.id}`);
    }
  }

  const threadOrgId = thread?.orgId ?? thread?.feedback?.orgId;

  if (!thread || !userOrgId || !threadOrgId || threadOrgId !== userOrgId) {
    notFound();
  }

  const role = (user.role ?? "").toUpperCase();
  const isAdmin = isAdminLikeRole(role);
  const isLeader = thread.feedback.recipientLeaderId === user.id;
  const isSender = thread.feedback.senderUserId === user.id;

  if (!isAdmin && !isLeader && !isSender) {
    notFound();
  }

  const view = isLeader && !isAdmin ? sanitizeThreadForLeader(thread as any) : thread;

  const payload: ThreadPayload = {
    id: view.id,
    anonHandle: view.anonHandle,
    feedbackId: view.feedbackId,
    feedback: {
      id: view.feedback.id,
      category: view.feedback.category,
      status: view.feedback.status,
      allowFollowup: view.feedback.allowFollowup,
      team: view.feedback.team ? { id: view.feedback.team.id, name: view.feedback.team.name } : null,
      createdAt: view.feedback.createdAt.toISOString(),
    },
    messages: view.messages.map((msg: any) => ({
      id: msg.id,
      direction: msg.direction,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
    })),
  };

  const locale = await getLocale();
  const canReply = (isLeader || isSender) && view.feedback.allowFollowup && view.feedback.status !== "resolved";
  const canResolve = isLeader || isAdmin;
  const backHref = isLeader || isAdmin ? "/app/feedback/inbox" : "/app/feedback";

  return (
    <ThreadClient
      locale={locale}
      thread={payload}
      isLeader={isLeader}
      isSender={isSender}
      canReply={canReply}
      canResolve={canResolve}
      backHref={backHref}
    />
  );
}
