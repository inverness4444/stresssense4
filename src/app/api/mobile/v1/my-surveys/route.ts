import { NextResponse, type NextRequest } from "next/server";
import { getMobileUser } from "@/lib/authMobile";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamIds = user.teams.map((t: any) => t.teamId);
  const surveys = await prisma.survey.findMany({
    where: {
      organizationId: user.organizationId,
      status: "ACTIVE",
      targets: { some: { teamId: { in: teamIds } } },
    },
    orderBy: { createdAt: "desc" },
    include: { inviteTokens: true, responses: true },
  });

  const data = surveys.map((s: any) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    participation: s.inviteTokens.length ? Math.round((s.responses.length / s.inviteTokens.length) * 100) : 0,
  }));

  return NextResponse.json({ data });
}
