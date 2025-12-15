import { NextResponse, type NextRequest } from "next/server";
import { getMobileUser } from "@/lib/authMobile";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      teams: user.teams.map((t) => t.teamId),
    },
  });
}
