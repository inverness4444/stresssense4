import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminLikeRole } from "@/lib/anonymousFeedback";
import { assertSameOrigin } from "@/lib/apiAuth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const feedback = await prisma.anonymousFeedback.findUnique({
    where: { id },
    select: { id: true, orgId: true, recipientLeaderId: true },
  });
  if (!feedback || feedback.orgId !== user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = (user.role ?? "").toUpperCase();
  const isAdmin = isAdminLikeRole(role);
  const isLeader = feedback.recipientLeaderId === user.id;
  if (!isAdmin && !isLeader) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const reason = (body?.reason ?? "").toString().trim();
  if (!reason || reason.length < 5) {
    return NextResponse.json({ error: "Reason required" }, { status: 400 });
  }

  const report = await prisma.abuseReport.create({
    data: {
      feedbackId: feedback.id,
      reportedByUserId: user.id,
      reason,
      status: "open",
    },
  });

  return NextResponse.json({ success: true, reportId: report.id });
}
