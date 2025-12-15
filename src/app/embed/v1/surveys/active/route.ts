import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/publicApi";
import { getBaseUrl } from "@/lib/url";

async function validate(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const publicKey = searchParams.get("publicKey");
  if (!workspaceId || !publicKey) return { error: errorResponse("UNAUTHORIZED", "Missing embed credentials", 401) };
  const config = await prisma.embedConfig.findUnique({ where: { organizationId: workspaceId } });
  if (!config || config.publicKey !== publicKey) return { error: errorResponse("UNAUTHORIZED", "Invalid embed key", 401) };
  const origin = req.headers.get("origin");
  if (config.allowedOrigins.length && origin && !config.allowedOrigins.includes(origin)) {
    return { error: errorResponse("FORBIDDEN", "Origin not allowed", 403) };
  }
  return { config };
}

export async function GET(req: Request) {
  const validated = await validate(req);
  if ("error" in validated) return validated.error;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId")!;

  const active = await prisma.survey.findFirst({
    where: { organizationId: workspaceId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!active) return NextResponse.json({ data: null });

  return NextResponse.json({
    data: {
      id: active.id,
      name: active.name,
      status: active.status,
      publicUrl: `${getBaseUrl()}/app/surveys/${active.id}`,
      note: "Responses still require an invite link or Slack/email token.",
    },
  });
}
