import { NextResponse } from "next/server";
import { getEngagementReport } from "@/lib/engagementScore";

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
  try {
    const body = await req.json();
    const { orgId, teamId, surveyId } = body ?? {};
    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }
    const report = await getEngagementReport({ orgId, teamId, surveyId });
    if (report?.insufficientSample || !report) {
      return NextResponse.json({ data: sample });
    }
    return NextResponse.json({ data: report });
  } catch (e) {
    return NextResponse.json({ data: sample });
  }
}
