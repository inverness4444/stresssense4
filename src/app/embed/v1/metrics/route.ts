import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/publicApi";
import { normalize } from "@/lib/stressMetrics";

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

  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: workspaceId } });
  const survey = await prisma.survey.findFirst({
    where: { organizationId: workspaceId },
    include: { responses: { include: { answers: true, inviteToken: true } }, inviteTokens: true },
    orderBy: { createdAt: "desc" },
  });
  if (!survey) return NextResponse.json({ data: null });

  const invites = survey.inviteTokens.length;
  const responses = survey.responses.length;
  const participation = invites ? Math.round((responses / invites) * 100) : 0;
  let sum = 0;
  let count = 0;
  survey.responses.forEach((r: any) =>
    r.answers.forEach((a: any) => {
      if (a.scaleValue != null) {
        sum += a.scaleValue;
        count += 1;
      }
    })
  );
  const avg = count ? sum / count : 0;
  const stressIndex = normalize(avg, settings?.stressScaleMin ?? 1, settings?.stressScaleMax ?? 5);

  return NextResponse.json({
    data: {
      surveyId: survey.id,
      surveyName: survey.name,
      averageStressIndex: stressIndex,
      participation,
    },
  });
}
