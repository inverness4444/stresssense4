require("ts-node/register");

const { PrismaClient } = require("@prisma/client");
const { STRESS_QUESTION_DAYS } = require("../src/config/stressQuestionBank");
const { computeOverallStressFromDrivers, scoreAnswer, normalizeDriverKey } = require("../src/lib/stressScoring");

const prisma = new PrismaClient();

const ENGAGEMENT_DIMENSIONS = new Set([
  "engagement",
  "clarity",
  "recognition",
  "psych_safety",
  "manager_support",
  "meetings_focus",
  "control",
  "safety",
  "atmosphere",
]);

function buildQuestionMetaMap() {
  const map = new Map();
  STRESS_QUESTION_DAYS.forEach((day) => {
    day.questions.forEach((q) => {
      [q.text, q.textEn, q.textRu]
        .filter(Boolean)
        .forEach((text) =>
          map.set(String(text).trim(), { driverKey: q.driverKey, driverTag: q.driverTag ?? null, polarity: q.polarity })
        );
    });
  });
  return map;
}

function normalizeAnswers(raw) {
  if (Array.isArray(raw)) {
    return raw.reduce((acc, item) => {
      if (item?.questionId) acc[item.questionId] = item;
      return acc;
    }, {});
  }
  if (raw && typeof raw === "object") return raw;
  return {};
}

async function backfillQuestionMeta() {
  const metaMap = buildQuestionMetaMap();
  const questions = await prisma.surveyQuestion.findMany({
    select: { id: true, text: true, driverKey: true, polarity: true, driverTag: true, dimension: true },
  });
  let updated = 0;
  for (const question of questions) {
    const trimmed = String(question.text ?? "").trim();
    const meta = metaMap.get(trimmed);
    const updates = {};
    if (meta) {
      updates.driverKey = meta.driverKey;
      updates.driverTag = meta.driverTag ?? meta.driverKey;
      updates.polarity = meta.polarity;
      updates.needsReview = false;
    } else {
      const derivedDriverKey = normalizeDriverKey(question.driverKey) ?? normalizeDriverKey(question.driverTag) ?? normalizeDriverKey(question.dimension) ?? "unknown";
      if (derivedDriverKey !== question.driverKey) updates.driverKey = derivedDriverKey;
      if (!question.driverTag) updates.driverTag = derivedDriverKey;
      if (!question.polarity) updates.polarity = "NEGATIVE";
      if (derivedDriverKey === "unknown") updates.needsReview = true;
    }
    if (Object.keys(updates).length) {
      await prisma.surveyQuestion.update({ where: { id: question.id }, data: updates });
      updated += 1;
    }
  }
  return updated;
}

async function recomputeRunMetrics() {
  const runs = await prisma.surveyRun.findMany({
    include: { responses: true, template: { include: { questions: true } }, team: true },
    orderBy: { launchedAt: "asc" },
  });
  let updatedRuns = 0;
  let updatedTeams = 0;

  for (const run of runs) {
    if (!run.responses.length || !run.template?.questions?.length) continue;
    const questionMap = new Map(run.template.questions.map((q) => [q.id, q]));
    const driverTotals = new Map();
    let fallbackSum = 0;
    let fallbackCount = 0;
    let engagementSum = 0;
    let engagementCount = 0;

    run.responses.forEach((response) => {
      const answers = normalizeAnswers(response.answers);
      Object.entries(answers).forEach(([questionId, answer]) => {
        const question = questionMap.get(questionId);
        if (!question || question.type !== "SCALE") return;
        const scored = scoreAnswer(answer, question);
        if (!scored) return;
        const totals = driverTotals.get(scored.driverKey) ?? { sum: 0, count: 0 };
        totals.sum += scored.stressScore;
        totals.count += 1;
        driverTotals.set(scored.driverKey, totals);
        fallbackSum += scored.stressScore;
        fallbackCount += 1;

        const dimension = String(question.dimension ?? "").toLowerCase();
        if (ENGAGEMENT_DIMENSIONS.has(dimension)) {
          engagementSum += scored.engagementScore;
          engagementCount += 1;
        }
      });
    });

    const stressStats = computeOverallStressFromDrivers(driverTotals);
    const stressIndex =
      stressStats.answerCount > 0
        ? stressStats.avg
        : fallbackCount > 0
          ? fallbackSum / fallbackCount
          : 0;
    const engagementScore = engagementCount ? engagementSum / engagementCount : 0;

    await prisma.surveyRun.update({
      where: { id: run.id },
      data: {
        avgStressIndex: Number(stressIndex.toFixed(2)),
        avgEngagementScore: Number(engagementScore.toFixed(2)),
        completedCount: run.responses.length,
      },
    });
    updatedRuns += 1;

    if (run.teamId) {
      const team = run.team ?? (await prisma.team.findUnique({ where: { id: run.teamId } }));
      const memberCount = team?.memberCount ?? run.responses.length;
      const participation = memberCount ? Math.min(100, Math.round((run.responses.length / memberCount) * 100)) : run.responses.length;
      await prisma.team.update({
        where: { id: run.teamId },
        data: {
          stressIndex: Number(stressIndex.toFixed(2)),
          engagementScore: Number(engagementScore.toFixed(2)),
          participation,
        },
      });
      const periodLabel = (run.runDate ?? run.launchedAt ?? new Date()).toISOString().slice(0, 10);
      const updated = await prisma.teamMetricsHistory.updateMany({
        where: { teamId: run.teamId, periodLabel },
        data: {
          stressIndex: Number(stressIndex.toFixed(2)),
          engagementScore: Number(engagementScore.toFixed(2)),
          participation,
        },
      });
      if (!updated.count) {
        await prisma.teamMetricsHistory.create({
          data: {
            teamId: run.teamId,
            periodLabel,
            stressIndex: Number(stressIndex.toFixed(2)),
            engagementScore: Number(engagementScore.toFixed(2)),
            participation,
            tags: run.tags ?? [],
          },
        });
      }
      updatedTeams += 1;
    }
  }

  return { updatedRuns, updatedTeams };
}

async function main() {
  const updatedQuestions = await backfillQuestionMeta();
  const { updatedRuns, updatedTeams } = await recomputeRunMetrics();
  console.log(`Updated questions: ${updatedQuestions}`);
  console.log(`Updated runs: ${updatedRuns}`);
  console.log(`Updated team rows: ${updatedTeams}`);
}

main()
  .catch((error) => {
    console.error("Recompute failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
