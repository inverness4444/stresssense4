import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminLikeRole, sanitizeFeedbackForLeader } from "@/lib/anonymousFeedback";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (user.role ?? "").toUpperCase();
  const isAdmin = isAdminLikeRole(role);
  const isLeader = role === "MANAGER" || isAdmin;
  if (!isLeader) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId") || undefined;
  const category = searchParams.get("category") || undefined;
  const status = searchParams.get("status") || undefined;

  const where: any = {
    orgId: user.organizationId,
  };
  if (!isAdmin) {
    where.recipientLeaderId = user.id;
  }
  if (teamId) where.teamId = teamId;
  if (category) where.category = category;
  if (status) where.status = status;

  const feedback = await prisma.anonymousFeedback.findMany({
    where,
    include: {
      team: { select: { id: true, name: true } },
      thread: { select: { id: true, anonHandle: true } },
      recipientLeader: isAdmin ? { select: { id: true, name: true } } : false,
    },
    orderBy: { createdAt: "desc" },
  });

  const data = feedback.map((item: any) => {
    const base = sanitizeFeedbackForLeader(item);
    return {
      ...base,
      preview: (item.message ?? "").slice(0, 140),
    };
  });

  return NextResponse.json({ data });
}
