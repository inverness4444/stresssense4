import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: {
      organizationId: "org_placeholder",
      averageStressIndex: 62,
      participation: 0.81,
      teamsAtRisk: 3,
    },
  });
}
