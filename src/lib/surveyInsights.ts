import { prisma } from "./prisma";
import { getAIClient } from "./ai";
import { triggerWebhookEvent } from "./webhooks";

type GenerateOptions = { force?: boolean; language?: string };

function buildScaleStats(question: { id: string; text: string; scaleMin: number | null; scaleMax: number | null }, responses: any[]) {
  const min = question.scaleMin ?? 1;
  const max = question.scaleMax ?? 5;
  const counts: Record<number, number> = {};
  for (let i = min; i <= max; i++) counts[i] = 0;
  responses.forEach((r) => {
    const ans = r.answers.find((a: any) => a.questionId === question.id);
    if (ans?.scaleValue != null) counts[ans.scaleValue] = (counts[ans.scaleValue] ?? 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const avg = total === 0 ? 0 : Object.entries(counts).reduce((acc, [k, v]) => acc + Number(k) * (v as number), 0) / total;
  return { min, max, counts, average: avg };
}

function buildPrompt(input: {
  surveyName: string;
  participation: number;
  responsesCount: number;
  inviteCount: number;
  questions: { text: string; stats?: { min: number; max: number; counts: Record<number, number>; average: number } }[];
  comments: string[];
}) {
  const scaleBlocks = input.questions
    .map((q, idx) => {
      if (!q.stats) return null;
      const dist = Object.entries(q.stats.counts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      return `${idx + 1}. "${q.text}" avg=${q.stats.average.toFixed(2)} scale ${q.stats.min}-${q.stats.max}, distribution: ${dist}`;
    })
    .filter(Boolean)
    .join("\n");

  const comments = input.comments.length
    ? input.comments
        .slice(0, 40)
        .map((c, i) => `${i + 1}. ${c}`)
        .join("\n")
    : "No free-text comments were provided.";

  return `
You are an HR stress insights assistant. Return a concise JSON with keys: summary (string, 2-3 paragraphs), suggestions (array of 3-6 actionable bullet strings), sentiment ("mostly_positive"|"mixed"|"mostly_negative"|"neutral"), themes (array of { "name": string, "share": number between 0-1 }).
Context:
- Survey name: ${input.surveyName}
- Responses: ${input.responsesCount} of ${input.inviteCount} invited (participation ${input.participation}%)
- Scale questions:
${scaleBlocks || "No scale questions"}
- Anonymous comments:
${comments}

Requirements:
- Keep tone professional and concise.
- Do not mention individual people.
- If little data, state uncertainty.
- Return ONLY valid JSON with the described keys.
`;
}

export async function generateSurveyInsight(surveyId: string, options?: GenerateOptions) {
  const existing = await prisma.surveyInsight.findUnique({ where: { surveyId } });
  if (existing && !options?.force) return existing;

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: true,
      responses: { include: { answers: true } },
      inviteTokens: true,
    },
  });
  if (!survey) throw new Error("Survey not found");

  const inviteCount = survey.inviteTokens.length;
  const responsesCount = survey.responses.length;
  const participation = inviteCount ? Math.round((responsesCount / inviteCount) * 100) : 0;

  const scaleQuestions = survey.questions.filter((q) => q.type === "SCALE");
  const questionStats = survey.questions.map((q) => ({
    text: q.text,
    stats: q.type === "SCALE" ? buildScaleStats(q, survey.responses) : undefined,
  }));

  const comments: string[] = [];
  survey.responses.forEach((r) => {
    r.answers.forEach((a) => {
      if (a.textValue) comments.push(a.textValue);
    });
  });

  const prompt = buildPrompt({
    surveyName: survey.name,
    participation,
    responsesCount,
    inviteCount,
    questions: questionStats,
    comments,
  });

  const ai = getAIClient();
  let parsed: { summary: string; suggestions: string[]; sentiment: string; themes?: { name: string; share: number }[] } = {
    summary: "AI summarization is currently unavailable.",
    suggestions: ["Review survey data manually.", "Enable AI provider to see insights."],
    sentiment: "neutral",
    themes: [],
  };

  try {
    const res = await ai.summarize({ prompt, maxTokens: 800 });
    const raw = res.text.trim();
    const jsonStart = raw.indexOf("{");
    const jsonString = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
    const data = JSON.parse(jsonString);
    parsed = {
      summary: data.summary ?? data.text ?? raw,
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      sentiment: data.sentiment ?? "mixed",
      themes: Array.isArray(data.themes) ? data.themes : [],
    };
  } catch (e) {
    console.warn("AI summary parse failed, using fallback", e);
  }

  const insight = await prisma.surveyInsight.upsert({
    where: { surveyId },
    update: {
      summaryText: parsed.summary,
      managerSuggestions: parsed.suggestions.join("\n"),
      sentimentLabel: parsed.sentiment,
      themes: parsed.themes ?? [],
      language: options?.language ?? "en",
      lastGeneratedAt: new Date(),
    },
    create: {
      surveyId,
      summaryText: parsed.summary,
      managerSuggestions: parsed.suggestions.join("\n"),
      sentimentLabel: parsed.sentiment,
      themes: parsed.themes ?? [],
      language: options?.language ?? "en",
    },
  });

  await triggerWebhookEvent(survey.organizationId, "survey.insight.generated", {
    surveyId,
    sentiment: parsed.sentiment,
    generatedAt: new Date().toISOString(),
  });

  return insight;
}
