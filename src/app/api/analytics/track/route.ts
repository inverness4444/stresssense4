import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";

const eventSchema = z.object({
  eventName: z.string().min(1).max(120),
  source: z.string().min(1).max(64),
  properties: z.record(z.any()).optional(),
  sessionId: z.string().max(128).optional(),
});

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const body = await req.json().catch(() => null);
  const parsed = eventSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "eventName and source are required" } },
      { status: 400 }
    );
  }
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`analytics:${ip}`, { limit: 200, windowMs: 60_000 });
  if (!limiter.allowed) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many requests" } }, { status: 429 });
  }
  const { eventName, source, properties, sessionId } = parsed.data;
  const safeProperties = properties ?? {};
  if (JSON.stringify(safeProperties).length > 8000) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "properties payload too large" } },
      { status: 400 }
    );
  }
  const user = await getCurrentUser();
  await prisma.productEvent.create({
    data: {
      eventName,
      source,
      properties: safeProperties,
      sessionId: sessionId ?? null,
      userId: user?.id ?? null,
      organizationId: user?.organizationId ?? null,
    },
  });
  return NextResponse.json({ ok: true });
}
