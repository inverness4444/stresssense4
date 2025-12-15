import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleSlackCallback } from "@/app/app/integrations/actions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) return NextResponse.redirect("/app/integrations");
  const [organizationId, nonce] = state.split(":");
  const stored = (await cookies()).get("slack_state")?.value;
  if (!stored || stored !== nonce) return NextResponse.redirect("/app/integrations");
  await handleSlackCallback(code, organizationId);
  return NextResponse.redirect("/app/integrations");
}
