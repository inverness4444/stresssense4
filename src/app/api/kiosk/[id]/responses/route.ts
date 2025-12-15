import { NextResponse, type NextRequest } from "next/server";
import { getKioskSession, ensureKioskUser } from "@/lib/kiosk";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/analytics";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: kioskId } = await params;
  const session = await getKioskSession(kioskId);
  if (!session || !session.isActive) return NextResponse.json({ error: "Kiosk not found" }, { status: 404 });
  const survey = await prisma.survey.findUnique({
    where: { id: session.surveyId },
    include: { questions: true },
  });
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.answers || !Array.isArray(body.answers)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const kioskUser = await ensureKioskUser(session.organizationId);
  const invite = await prisma.surveyInviteToken.create({
    data: { surveyId: survey.id, userId: kioskUser.id, token: `kiosk_${kioskId}_${Date.now()}` },
  });
  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: survey.id,
      inviteTokenId: invite.id,
      kioskSessionId: session.id,
      answers: {
        create: body.answers.map((a: any) => ({
          questionId: a.questionId,
          scaleValue: a.type === "SCALE" ? a.scaleValue ?? null : null,
          textValue: a.type === "TEXT" ? a.textValue ?? null : null,
        })),
      },
    },
  });
  await trackProductEvent({
    eventName: "response_submitted_kiosk",
    source: "kiosk",
    properties: { surveyId: survey.id, kioskId, responseId: response.id },
  });
  return NextResponse.json({ ok: true });
}
