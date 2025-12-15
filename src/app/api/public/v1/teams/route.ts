import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [{ id: "team_demo", name: "Product", stressIndex: 63, participation: 82 }],
  });
}
