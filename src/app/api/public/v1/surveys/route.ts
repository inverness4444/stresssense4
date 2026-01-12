import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req, ["read:surveys"]);
  if ("error" in auth) return auth.error;

  const surveys = await prisma.survey.findMany({
    where: { organizationId: auth.key!.organizationId },
    orderBy: { createdAt: "desc" },
    include: { inviteTokens: true, responses: true },
    take: 50,
  });

  return NextResponse.json({
    data: surveys.map((survey: any) => ({
      id: survey.id,
      name: survey.name,
      status: survey.status,
      createdAt: survey.createdAt,
      participation: survey.inviteTokens.length
        ? Math.round((survey.responses.length / survey.inviteTokens.length) * 100)
        : 0,
    })),
  });
}
