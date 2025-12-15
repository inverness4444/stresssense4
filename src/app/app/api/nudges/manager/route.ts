import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNudgesForOrg, listPlaybooks, updateNudgeStatus } from "@/lib/nudgesStore";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamLinks =
    user.role === "HR"
      ? await prisma.team.findMany({ where: { organizationId: user.organizationId } })
      : await prisma.member
          .findMany({ where: { userId: user.id }, include: { team: true } })
          .then((rows: any[]) => rows.map((r: any) => r.team));

  const teamIds = teamLinks.map((t: any) => t.id);

  const nudges = await getNudgesForOrg(user.organizationId);
  const filtered = nudges.filter((n: any) => (user.role === "HR" ? true : teamIds.includes(n.teamId)));
  const enriched = filtered.map((n: any) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    dueAt: n.dueAt ? n.dueAt.toISOString() : null,
    resolvedAt: n.resolvedAt ? n.resolvedAt.toISOString() : null,
    level: (n as any).template?.triggerLevel ?? "Watch",
  }));
  const levelWeight: Record<string, number> = { AtRisk: 3, UnderPressure: 2, Watch: 1, Calm: 0 };
  enriched.sort((a: any, b: any) => {
    const lw = (levelWeight[b.level] ?? 0) - (levelWeight[a.level] ?? 0);
    if (lw !== 0) return lw;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({
    nudges: enriched,
    playbooks: listPlaybooks(),
    teams: teamLinks.map((t: any) => ({ id: t.id, name: t.name })),
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
