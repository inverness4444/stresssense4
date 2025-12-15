import { prisma } from "@/lib/prisma";

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export async function buildPersonalStatusSnapshots() {
  const users = await prisma.user.findMany({ where: { isDeleted: false } });
  const now = new Date();
  const from = new Date(Date.now() - 30 * 86400000);

  for (const user of users) {
    const orgId = user.organizationId;

    const moodSamples = await prisma.surveyAnswer.findMany({
      where: {
        response: { inviteToken: { userId: user.id }, submittedAt: { gte: from } },
        scaleValue: { not: null },
      },
      select: { scaleValue: true },
      take: 200,
    });

    const habitCheckins = await prisma.habitCheckin.findMany({
      where: { userId: user.id, date: { gte: from } },
    });

    const coachMessages = await prisma.coachMessage.count({
      where: { session: { userId: user.id, createdAt: { gte: from } }, role: "user" },
    });

    const academyEnroll = await prisma.academyEnrollment.findMany({
      where: { userId: user.id, status: { in: ["in_progress", "completed"] } },
    });

    const enrollmentCompleted = academyEnroll.filter((e: any) => e.status === "completed").length;
    const academyProgress = academyEnroll.length ? enrollmentCompleted / academyEnroll.length : null;

    const habitCompletionRate = habitCheckins.length
      ? habitCheckins.filter((c: any) => c.status === "done").length / habitCheckins.length
      : null;

    const moodAverage = moodSamples.length ? avg(moodSamples.map((m: any) => (m.scaleValue ?? 0) * 2)) : null; // normalize to 0-10

    const prev = await prisma.personalStatusSnapshot.findFirst({
      where: { organizationId: orgId, userId: user.id },
      orderBy: { periodEnd: "desc" },
    });

    let trend = "Stable";
    if (prev && prev.stressLevelScore != null && habitCompletionRate != null) {
      if ((prev.stressLevelScore ?? 0) - (moodAverage ?? 0) > 1) trend = "At risk";
      if ((prev.habitCompletionRate ?? 0) < (habitCompletionRate ?? 0)) trend = "Improving";
    }

    await prisma.personalStatusSnapshot.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        periodStart: from,
        periodEnd: now,
        engagementScore: moodAverage ?? null,
        stressLevelScore: prev?.stressLevelScore ?? moodAverage ?? null,
        moodAverage,
        habitCompletionRate,
        coachConversations: coachMessages,
        academyProgressScore: academyProgress,
        trendLabel: trend,
      },
    });
  }
}
