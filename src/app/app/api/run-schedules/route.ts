import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runSurveySchedules } from "@/lib/surveySchedules";
import { assertSameOrigin } from "@/lib/apiAuth";

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const user = await getCurrentUser();
  const token = process.env.SCHEDULE_TRIGGER_TOKEN;

  if (token) {
    const hdrs = await (await import("next/headers")).headers();
    const provided = hdrs.get("x-schedule-token");
    if (provided !== token && (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await runSurveySchedules();
  return NextResponse.json({ success: true });
}
