import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEngagementReport } from "@/lib/engagementScore";
import { assertSameOrigin, requireApiUser } from "@/lib/apiAuth";

const sample = {
  score: 8.4,
  delta: 0.6,
  deltaDirection: "up",
  responsesCount: 240,
  periodLabel: "Mar – May",
  timeseries: [
    { date: "2025-03-01", score: 7.4 },
    { date: "2025-03-15", score: 7.5 },
    { date: "2025-04-01", score: 7.6 },
    { date: "2025-04-15", score: 7.9 },
    { date: "2025-05-01", score: 8.1 },
    { date: "2025-05-15", score: 8.4 },
  ],
  drivers: ["recognition", "manager_support", "focus"],
  summary: "Engagement grew by 0.6 points in the last 3 months, driven by better recognition and manager support. Workload is still worth watching.",
  actions: [
    "Run quick 1:1s with overloaded teams",
    "Launch a recognition shoutout in Slack",
    "Reprioritize Q2 projects to ease cognitive load",
  ],
};

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;
    const user = auth.user;
    const role = (user.role ?? "").toUpperCase();
    if (!["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { teamId, surveyId } = body ?? {};
    const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { isDemo: true } });

    if (teamId) {
      const teamExists = await prisma.team.findFirst({
        where: { id: teamId, organizationId: user.organizationId },
        select: { id: true },
      });
      if (!teamExists) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    if (surveyId) {
      const surveyExists = await prisma.survey.findFirst({
        where: { id: surveyId, organizationId: user.organizationId },
        select: { id: true },
      });
      if (!surveyExists) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const report = await getEngagementReport({ orgId: user.organizationId, teamId, surveyId });
    if (report?.insufficientSample || !report) {
      if (org?.isDemo) return NextResponse.json({ data: sample });
      return NextResponse.json({ data: { insufficientSample: true } });
    }
    return NextResponse.json({ data: report });
  } catch {
    return NextResponse.json({ data: { insufficientSample: true } });
  }
}
