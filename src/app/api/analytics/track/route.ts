import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.eventName || !body?.source) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "eventName and source are required" } }, { status: 400 });
  }
  const user = await getCurrentUser();
  await prisma.productEvent.create({
    data: {
      eventName: body.eventName,
      source: body.source,
      properties: body.properties ?? {},
      sessionId: body.sessionId ?? null,
      userId: user?.id ?? null,
      organizationId: user?.organizationId ?? null,
    },
  });
  return NextResponse.json({ ok: true });
}
