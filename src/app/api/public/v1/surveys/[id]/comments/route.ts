import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiRequest, errorResponse } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";
import { ensureOrgSettings } from "@/lib/access";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(req, ["read:comments"]);
  if ("error" in auth) return auth.error;

  const survey = await prisma.survey.findFirst({
    where: { id, organizationId: auth.key!.organizationId },
    include: {
      questions: true,
      responses: { include: { answers: true } },
      organization: { include: { settings: true } },
    },
  });
  if (!survey) return errorResponse("NOT_FOUND", "Survey not found", 404);

  const settings = survey.organization.settings ?? (await ensureOrgSettings(auth.key!.organizationId));
  const minBreakdown = survey.minResponsesForBreakdown ?? settings.minResponsesForBreakdown ?? 4;
  if (survey.responses.length < minBreakdown) {
    return errorResponse("FORBIDDEN", "Not enough responses to show comments", 403);
  }

  const textQuestionIds = survey.questions.filter((q: any) => q.type === "TEXT").map((q: any) => q.id);
  const comments = survey.responses
    .flatMap((r: any) =>
      r.answers
        .filter((a: any) => textQuestionIds.includes(a.questionId) && a.textValue)
        .map((a: any) => ({ text: a.textValue, submittedAt: r.submittedAt }))
    )
    .filter((c: any) => c.text);

  return NextResponse.json({
    data: comments.map((c: any) => ({ text: c.text, submittedAt: c.submittedAt })),
  });
}
