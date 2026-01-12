import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { getOrCreateDailySurveyRun } from "@/lib/dailySurveys";

const RUN_ROLES = ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] as const;

type CronResult = {
  ok: boolean;
  processed: number;
  created: number;
  skipped: number;
  errors: number;
};

function isAuthorized(req: NextRequest) {
  const token = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("token");
  return Boolean(token && env.CRON_SECRET && token === env.CRON_SECRET);
}

export async function POST(req: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET missing" }, { status: 500 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.member.findMany({
    where: {
      userId: { not: null },
      user: { role: { in: RUN_ROLES } },
    },
    select: { id: true, userId: true },
  });

  const now = new Date();
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const member of members) {
    try {
      const run = await getOrCreateDailySurveyRun({
        memberId: member.id,
        date: now,
        createdByUserId: member.userId ?? undefined,
      });
      if (run) {
        created += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      errors += 1;
      if (env.isDev) {
        console.warn("Daily survey cron failed", member.id, err);
      }
    }
  }

  const result: CronResult = {
    ok: true,
    processed: members.length,
    created,
    skipped,
    errors,
  };

  return NextResponse.json(result);
}
