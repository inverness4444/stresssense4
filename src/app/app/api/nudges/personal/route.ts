import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPersonalNudge, getNudgesForMember, updateNudgeStatus } from "@/lib/nudgesStore";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) return NextResponse.json({ nudges: [] });
  const nudges = (await getNudgesForMember(member.id)).map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    dueAt: n.dueAt ? n.dueAt.toISOString() : null,
    resolvedAt: n.resolvedAt ? n.resolvedAt.toISOString() : null,
  }));
  return NextResponse.json({ nudges });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title, description, tags, templateId } = body ?? {};
  const member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) return NextResponse.json({ error: "No member profile" }, { status: 400 });
  const nudge = await createPersonalNudge({
    orgId: user.organizationId,
    teamId: body.teamId ?? member.teamId,
    memberId: member.id,
    templateId,
    title,
    description,
    tags,
  });
  return NextResponse.json({
    nudge: { ...nudge, createdAt: nudge.createdAt.toISOString(), dueAt: nudge.dueAt, resolvedAt: nudge.resolvedAt },
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, status } = body ?? {};
  const updated = await updateNudgeStatus(id, status);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    nudge: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      dueAt: updated.dueAt ? updated.dueAt.toISOString() : null,
      resolvedAt: updated.resolvedAt ? updated.resolvedAt.toISOString() : null,
    },
  });
}
