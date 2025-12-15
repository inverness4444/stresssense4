import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runSurveySchedules } from "@/lib/surveySchedules";

export async function POST() {
  const user = await getCurrentUser();
  const token = process.env.SCHEDULE_TRIGGER_TOKEN;

  if (token) {
    const hdrs = await (await import("next/headers")).headers();
    const provided = hdrs.get("x-schedule-token");
    if (provided !== token && (!user || user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await runSurveySchedules();
  return NextResponse.json({ success: true });
}
