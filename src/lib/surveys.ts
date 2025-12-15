import { prisma } from "./prisma";
import { getCache, setCache } from "./cache";

export type SurveyStats = {
  participation: number;
  responsesCount: number;
  inviteCount: number;
  averageStressIndex: number;
  teamCounts: number;
};

export async function getSurveyWithMetrics(
  surveyId: string,
  organizationId: string,
  options?: { allowedTeamIds?: string[]; allowedUserIds?: string[]; scaleMin?: number; scaleMax?: number; minResponses?: number }
) {
  const cacheKey = `survey:${organizationId}:${surveyId}:${options?.allowedUserIds?.join(",") || "all"}:${options?.allowedTeamIds?.join(",") || "all"}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, organizationId },
    include: {
      targets: { include: { team: true } },
      questions: { orderBy: { order: "asc" } },
      responses: {
        include: {
          answers: true,
          inviteToken: {
            include: { user: { include: { teams: { include: { team: true } } } } },
          },
        },
      },
      inviteTokens: {
        include: {
          user: {
            include: {
              teams: true,
            },
          },
        },
      },
    },
  });

  if (!survey) return null;

  const scaleMin = options?.scaleMin ?? 1;
  const scaleMax = options?.scaleMax ?? 5;

  const filterByTeam = (userTeams: { teamId: string }[]) =>
    options?.allowedTeamIds && options.allowedTeamIds.length
      ? userTeams.some((t) => options.allowedTeamIds?.includes(t.teamId))
      : true;
  const filterByUser = (userId: string) =>
    options?.allowedUserIds && options.allowedUserIds.length ? options.allowedUserIds.includes(userId) : true;

  const filteredResponses = survey.responses.filter(
    (r) => filterByTeam(r.inviteToken.user.teams) && filterByUser(r.inviteToken.userId)
  );

  const filteredInvites = survey.inviteTokens.filter((i) => filterByTeam(i.user.teams) && filterByUser(i.userId));

  const stats = computeSurveyStats(filteredResponses.length, filteredInvites.length, survey.questions, filteredResponses, scaleMin, scaleMax);

  const questionBreakdown = survey.questions.map((q) => {
    if (q.type === "SCALE") {
      const counts: Record<number, number> = {};
      const scaleMin = q.scaleMin ?? 1;
      const scaleMax = q.scaleMax ?? 5;
      for (let i = scaleMin; i <= scaleMax; i++) counts[i] = 0;
      filteredResponses.forEach((r) => {
        const answer = r.answers.find((a) => a.questionId === q.id);
        if (answer?.scaleValue != null) {
          counts[answer.scaleValue] = (counts[answer.scaleValue] ?? 0) + 1;
        }
      });
      const totalAnswers = Object.values(counts).reduce((a, b) => a + b, 0);
      const avg =
        totalAnswers === 0
          ? 0
          : Object.entries(counts).reduce((acc, [k, v]) => acc + Number(k) * v, 0) / totalAnswers;
      const stressIndex = normalizeScale(avg, scaleMin, scaleMax);
      return { question: q, counts, average: avg, stressIndex };
    }
    const comments = filteredResponses
      .map((r) => ({
        submittedAt: r.submittedAt,
        text: r.answers.find((a) => a.questionId === q.id)?.textValue,
      }))
      .filter((c) => c.text) as { submittedAt: Date; text: string }[];
    comments.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    return { question: q, comments };
  });

  const allowedTeams = options?.allowedTeamIds?.length ? options.allowedTeamIds : survey.targets.map((t) => t.teamId);

  const teamBreakdown = survey.targets
    .filter((t) => allowedTeams.includes(t.teamId))
    .map((t) => {
      const responses = filteredResponses.filter((r) => r.inviteToken.user.teams.some((ut) => ut.teamId === t.teamId));
      const inviteCount = filteredInvites.filter((it) => it.user.teams.some((ut) => ut.teamId === t.teamId)).length;
      const avg = computeAverageStressForResponses(responses, survey.questions);
      const stressIndex = normalizeScale(avg, scaleMin, scaleMax);
      const participation = inviteCount ? Math.round((responses.length / inviteCount) * 100) : 0;
      const status = stressIndex >= 70 ? "High" : stressIndex >= 40 ? "Moderate" : "Healthy";
      return {
        team: t.team,
        responses: responses.length,
        inviteCount,
        participation,
        stressIndex,
        status,
      };
    });

  const result = { survey, stats, questionBreakdown, teamBreakdown };
  await setCache(cacheKey, result, 60);
  return result;
}

export function computeSurveyStats(
  responsesCount: number,
  inviteCount: number,
  questions: { type: string; scaleMin: number | null; scaleMax: number | null; id: string }[],
  responses: {
    answers: { questionId: string; scaleValue: number | null }[];
  }[],
  scaleMin = 1,
  scaleMax = 5
): SurveyStats {
  const participation = inviteCount ? Math.round((responsesCount / inviteCount) * 100) : 0;
  const avg = computeAverageStressForResponses(responses, questions);
  const stressIndex = normalizeScale(avg, scaleMin, scaleMax);
  return {
    participation,
    responsesCount,
    inviteCount,
    averageStressIndex: stressIndex,
    teamCounts: 0,
  };
}

function computeAverageStressForResponses(
  responses: { answers: { questionId: string; scaleValue: number | null }[] }[],
  questions: { id: string; type: string; scaleMin: number | null; scaleMax: number | null }[]
) {
  let sum = 0;
  let count = 0;
  questions
    .filter((q) => q.type === "SCALE")
    .forEach((q) => {
      responses.forEach((r) => {
        const ans = r.answers.find((a) => a.questionId === q.id);
        if (ans?.scaleValue != null) {
          sum += ans.scaleValue;
          count += 1;
        }
      });
    });
  return count === 0 ? 0 : sum / count;
}

export function normalizeScale(value: number, min = 1, max = 5) {
  if (value === 0) return 0;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

export async function latestSurveyForOrg(orgId: string) {
  return prisma.survey.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: { responses: true, inviteTokens: true },
  });
}
