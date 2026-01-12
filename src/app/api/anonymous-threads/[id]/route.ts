import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminLikeRole, sanitizeThreadForLeader } from "@/lib/anonymousFeedback";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const thread = await prisma.anonymousThread.findUnique({
    where: { id },
    include: {
      feedback: {
        include: {
          team: { select: { id: true, name: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread || thread.orgId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = (user.role ?? "").toUpperCase();
  const isAdmin = isAdminLikeRole(role);
  const isLeader = thread.feedback.recipientLeaderId === user.id;
  const isSender = thread.feedback.senderUserId === user.id;

  if (!isAdmin && !isLeader && !isSender) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = isLeader && !isAdmin ? sanitizeThreadForLeader(thread as any) : thread;

  return NextResponse.json({ data: payload });
}
