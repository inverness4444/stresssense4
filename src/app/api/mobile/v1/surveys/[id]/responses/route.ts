import { NextResponse, type NextRequest } from "next/server";
import { getMobileUser } from "@/lib/authMobile";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const surveyId = id;
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, organizationId: user.organizationId, status: "ACTIVE" },
    include: { questions: true, inviteTokens: { where: { userId: user.id } } },
  });
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  const invite = survey.inviteTokens[0];
  if (!invite) return NextResponse.json({ error: "No invite for this user" }, { status: 403 });
  if (invite.usedAt) return NextResponse.json({ error: "Already submitted" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.answers)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId,
      inviteTokenId: invite.id,
      answers: {
        create: body.answers.map((a: any) => ({
          questionId: a.questionId,
          scaleValue: a.type === "SCALE" ? a.scaleValue ?? null : null,
          textValue: a.type === "TEXT" ? a.textValue ?? null : null,
        })),
      },
    },
  });

  await prisma.surveyInviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
  return NextResponse.json({ data: { responseId: response.id } });
}
