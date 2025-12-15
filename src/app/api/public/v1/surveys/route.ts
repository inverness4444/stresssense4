import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      {
        id: "survey_demo",
        name: "Stress Pulse",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        participation: 0.76,
      },
    ],
  });
}
