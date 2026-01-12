import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNudgesForOrg, listPlaybooks, updateNudgeStatus } from "@/lib/nudgesStore";
import { assertSameOrigin, requireApiUser } from "@/lib/apiAuth";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const user = auth.user;

  const isAdmin = ["ADMIN", "HR", "SUPER_ADMIN"].includes(user.role);
  const teamLinks =
    isAdmin
      ? await prisma.team.findMany({ where: { organizationId: user.organizationId } })
      : await prisma.member
          .findMany({ where: { userId: user.id }, include: { team: true } })
          .then((rows: any[]) => rows.map((r: any) => r.team));

  const teamIds = teamLinks.map((t: any) => t.id);

  const nudges = await getNudgesForOrg(user.organizationId);
  const filtered = nudges.filter((n: any) => (isAdmin ? true : teamIds.includes(n.teamId)));
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
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const user = auth.user;
  const body = await req.json();
  const { id, status } = body ?? {};
  const nudge = await prisma.nudgeInstance.findFirst({
    where: { id, orgId: user.organizationId },
    select: { id: true, teamId: true },
  });
  if (!nudge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (user.role ?? "").toUpperCase();
  if (!["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) {
    const teamIds = (
      await prisma.userTeam.findMany({
        where: { userId: user.id },
        select: { teamId: true },
      })
    ).map((t: any) => t.teamId);
    if (!teamIds.includes(nudge.teamId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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
