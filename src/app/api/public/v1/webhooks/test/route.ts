import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/publicApi";

export async function POST(req: Request) {
  const auth = await authenticateApiRequest(req, ["manage:webhooks"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ data: { sent: true } });
}
