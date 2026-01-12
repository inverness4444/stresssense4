const { PrismaClient } = require("@prisma/client");

const EMAIL = "abuzada@mail.ru";
const START_DATE = "2025-12-17";
const DAYS = 20;
const TEMPLATE_NAME = "Backfill daily survey";

const QUESTIONS = [
  { text: "Overall stress today", dimension: "stress", driverTag: "stress", driverKey: "recovery_energy", polarity: "NEGATIVE" },
  { text: "Workload feels manageable", dimension: "workload", driverTag: "workload", driverKey: "workload_deadlines", polarity: "POSITIVE" },
  { text: "Priorities are clear", dimension: "clarity", driverTag: "clarity", driverKey: "clarity_priorities", polarity: "POSITIVE" },
  { text: "I feel recognized for my work", dimension: "recognition", driverTag: "recognition", driverKey: "recognition_feedback", polarity: "POSITIVE" },
  { text: "I feel psychologically safe", dimension: "psych_safety", driverTag: "psych_safety", driverKey: "psychological_safety", polarity: "POSITIVE" },
  { text: "I feel engaged with my work", dimension: "engagement", driverTag: "engagement", driverKey: "autonomy_control", polarity: "POSITIVE" },
  { text: "Work-life balance is healthy", dimension: "stress", driverTag: "balance", driverKey: "recovery_energy", polarity: "POSITIVE" },
  { text: "I can focus without interruptions", dimension: "engagement", driverTag: "meetings_focus", driverKey: "meetings_focus", polarity: "POSITIVE" },
  { text: "I can ask for help when needed", dimension: "psych_safety", driverTag: "psych_safety", driverKey: "manager_support", polarity: "POSITIVE" },
  { text: "Manager support is sufficient", dimension: "recognition", driverTag: "manager_support", driverKey: "manager_support", polarity: "POSITIVE" },
  { text: "My workload is sustainable", dimension: "workload", driverTag: "workload", driverKey: "workload_deadlines", polarity: "POSITIVE" },
];

const STRESS_DIMENSIONS = new Set(["stress", "workload"]);
const ENGAGEMENT_DIMENSIONS = new Set(["engagement", "clarity", "recognition", "psych_safety"]);

const toUtcDate = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);
const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const scoreFor = (dayIndex, questionIndex) => {
  const base = 4 + (dayIndex % 5) * 0.5;
  const variance = ((questionIndex + dayIndex) % 3) * 0.3;
  return Math.max(0, Math.min(10, Number((base + variance).toFixed(1))));
};

const average = (values) => {
  if (!values.length) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Number((sum / values.length).toFixed(2));
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: EMAIL },
      select: { id: true, organizationId: true },
    });
    if (!user) throw new Error(`User not found for email ${EMAIL}`);

    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      select: { id: true, teamId: true },
    });
    if (!member) throw new Error(`Member not found for user ${user.id}`);

    let template = await prisma.surveyTemplate.findFirst({
      where: { orgId: user.organizationId, name: TEMPLATE_NAME },
      include: { questions: true },
    });

    if (!template) {
      template = await prisma.surveyTemplate.create({
        data: {
          orgId: user.organizationId,
          name: TEMPLATE_NAME,
          title: TEMPLATE_NAME,
          description: "Backfilled daily survey",
          language: "en",
          source: "seed",
          questions: {
            create: QUESTIONS.map((q, idx) => ({
              order: idx + 1,
              text: q.text,
              description: null,
              helpText: null,
              type: "SCALE",
              scaleMin: 0,
              scaleMax: 10,
              dimension: q.dimension,
              driverTag: q.driverTag,
              driverKey: q.driverKey,
              polarity: q.polarity,
              needsReview: false,
              required: true,
            })),
          },
        },
        include: { questions: true },
      });
    }

    const startDate = toUtcDate(START_DATE);
    let createdRuns = 0;
    let createdResponses = 0;
    let skippedResponses = 0;

    for (let i = 0; i < DAYS; i += 1) {
      const dayIndex = i + 1;
      const runDate = addDays(startDate, i);
      const runDateKey = runDate.toISOString().slice(0, 10);

      let run = await prisma.surveyRun.findFirst({
        where: { memberId: member.id, runDate, runType: "daily" },
        include: { responses: true, template: { include: { questions: true } } },
      });

      if (!run) {
        run = await prisma.surveyRun.create({
          data: {
            orgId: user.organizationId,
            teamId: member.teamId,
            memberId: member.id,
            templateId: template.id,
            title: `Day ${dayIndex} - Backfilled survey`,
            launchedByUserId: user.id,
            launchedAt: new Date(runDate.getTime() + 12 * 60 * 60 * 1000),
            runDate,
            runType: "daily",
            source: dayIndex > 10 ? "ai" : "seed",
            dayIndex,
            targetCount: 1,
            completedCount: 0,
          },
          include: { responses: true, template: { include: { questions: true } } },
        });
        createdRuns += 1;
      }

      if (run.responses.length > 0) {
        skippedResponses += 1;
        continue;
      }

      const questions = run.template?.questions?.length ? run.template.questions : template.questions;
      const answers = {};
      const stressValues = [];
      const engagementValues = [];
      const allValues = [];

      questions.forEach((q, idx) => {
        const value = scoreFor(dayIndex, idx);
        answers[q.id] = { questionId: q.id, type: q.type, scaleValue: value };
        allValues.push(value);
        const dimension = String(q.dimension ?? "").toLowerCase();
        if (STRESS_DIMENSIONS.has(dimension)) stressValues.push(value);
        if (ENGAGEMENT_DIMENSIONS.has(dimension)) engagementValues.push(value);
      });

      const submittedAt = new Date(runDate.getTime() + 15 * 60 * 60 * 1000);
      await prisma.surveyResponse.create({
        data: {
          runId: run.id,
          memberId: member.id,
          respondentEmail: EMAIL,
          submittedAt,
          answers,
        },
      });

      const avgStress = average(stressValues.length ? stressValues : allValues);
      const avgEngagement = average(engagementValues.length ? engagementValues : allValues);

      await prisma.surveyRun.update({
        where: { id: run.id },
        data: {
          completedCount: 1,
          avgStressIndex: avgStress,
          avgEngagementScore: avgEngagement,
        },
      });

      createdResponses += 1;
      console.log(`Seeded ${runDateKey} (Day ${dayIndex})`);
    }

    const runsToNormalize = await prisma.surveyRun.findMany({
      where: { memberId: member.id, runType: "daily", runDate: { gte: startDate } },
      orderBy: { runDate: "asc" },
      select: { id: true, dayIndex: true, title: true, runDate: true, templateId: true, source: true },
    });
    let normalized = 0;
    for (let idx = 0; idx < runsToNormalize.length; idx += 1) {
      const expectedDayIndex = idx + 1;
      const run = runsToNormalize[idx];
      const shouldUpdateDay = run.dayIndex !== expectedDayIndex;
      const shouldUpdateTitle = run.templateId === template.id && run.title !== `Day ${expectedDayIndex} - Backfilled survey`;
      const shouldUpdateSource = run.templateId === template.id && run.source !== (expectedDayIndex > 10 ? "ai" : "seed");
      if (shouldUpdateDay || shouldUpdateTitle || shouldUpdateSource) {
        await prisma.surveyRun.update({
          where: { id: run.id },
          data: {
            dayIndex: expectedDayIndex,
            ...(shouldUpdateTitle ? { title: `Day ${expectedDayIndex} - Backfilled survey` } : {}),
            ...(shouldUpdateSource ? { source: expectedDayIndex > 10 ? "ai" : "seed" } : {}),
          },
        });
        normalized += 1;
      }
    }

    console.log({ createdRuns, createdResponses, skippedResponses, normalized });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
