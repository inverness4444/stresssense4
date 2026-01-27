import { addDays, endOfDay, startOfDay } from "date-fns";
import OpenAI from "openai";
import { z } from "zod";
import { env } from "@/config/env";
import { STRESS_QUESTION_DAYS, type StressQuestion } from "@/config/stressQuestionBank";
import { prisma } from "@/lib/prisma";
import { computeStatsForResponses } from "@/lib/ai/analysisAggregates";
import { getBillingGateStatus } from "@/lib/billingGate";
import { createNotification } from "@/lib/notifications";
import { DRIVER_KEYS, mapDriverKeyToDimension, normalizeDriverKey, normalizePolarity, type DriverKey } from "@/lib/stressScoring";

export type DailySurveyQuestion = {
  id: string;
  order: number;
  text: string;
  description?: string | null;
  helpText?: string | null;
  type: string;
  dimension?: string | null;
  choices?: string[] | null;
  scaleMin?: number | null;
  scaleMax?: number | null;
  driverTag?: string | null;
  driverKey?: string | null;
  polarity?: string | null;
  needsReview?: boolean | null;
  aiReason?: string | null;
  required?: boolean | null;
};

export type DailySurveyPayload = {
  runId: string;
  runDate: string;
  title: string;
  dayIndex: number | null;
  source: "seed" | "ai" | "manual";
  questions: DailySurveyQuestion[];
};

const SEED_DAYS = 10;
export const DAILY_SURVEY_SEED_DAYS = SEED_DAYS;
const QUESTIONS_PER_SURVEY = 11;

const AI_DRIVER_KEYS = DRIVER_KEYS.filter((key) => key !== "unknown");

const AI_QUESTION_SCHEMA = z.object({
  type: z.string().min(1),
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  options: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  driverKey: z.string().optional().nullable(),
  polarity: z.enum(["NEGATIVE", "POSITIVE"]).optional().nullable(),
  reason: z.string().optional().nullable(),
  needsReview: z.boolean().optional().default(false),
  required: z.boolean().optional().default(true),
});

const AI_SURVEY_SCHEMA = z.object({
  questions: z.array(AI_QUESTION_SCHEMA).min(1),
});

type GenerationContext = {
  locale: "ru" | "en";
  dayIndex: number;
  recentQuestions: string[];
  recentAnswerSamples: Array<{
    question: string;
    value: number;
    driverKey: string | null;
    polarity: string | null;
  }>;
  driverSummary: Array<{ key: string; avg: number | null; delta: number | null; count: number }>;
  missingDrivers: string[];
};

type GenerateAiQuestionsOptions = {
  count?: number;
  existingQuestions?: string[];
  fillOnly?: boolean;
};

function getLocalizedQuestionText(question: StressQuestion, locale: "ru" | "en") {
  if (locale === "ru") return question.textRu ?? question.text;
  return question.textEn ?? question.text;
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(items: T[], seed: number) {
  const result = [...items];
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  const next = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function getMemberDailyQuestionTexts(memberId: string) {
  const previousRuns = await prisma.surveyRun.findMany({
    where: { memberId, runType: "daily" },
    select: { template: { select: { questions: { select: { text: true } } } } },
  });
  const usedTexts = new Set<string>();
  previousRuns.forEach((run) => {
    run.template?.questions?.forEach((q) => {
      const text = q.text?.trim();
      if (text) usedTexts.add(text);
    });
  });
  return usedTexts;
}

function normalizeLocale(locale?: string | null): "ru" | "en" {
  return locale === "ru" ? "ru" : "en";
}

function getDateKey(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const year = get("year");
    const month = get("month");
    const day = get("day");
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // ignore and fallback
  }
  return date.toISOString().slice(0, 10);
}

function runDateFromKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function normalizeAnswerMap(answersRaw: unknown) {
  if (Array.isArray(answersRaw)) {
    return answersRaw.reduce<Record<string, any>>((acc, item: any) => {
      if (item?.questionId) acc[item.questionId] = item;
      return acc;
    }, {});
  }
  if (answersRaw && typeof answersRaw === "object") return answersRaw as Record<string, any>;
  return {} as Record<string, any>;
}

function extractRecentAnswerSamples(responses: any[], limit = 6) {
  const samples: GenerationContext["recentAnswerSamples"] = [];
  const seen = new Set<string>();

  for (const resp of responses) {
    const questions = resp?.run?.template?.questions ?? [];
    const questionMap = new Map<string, any>();
    questions.forEach((q: any) => {
      if (q?.id) questionMap.set(q.id, q);
    });
    const answers = normalizeAnswerMap(resp?.answers);
    for (const [questionId, answer] of Object.entries(answers)) {
      if (samples.length >= limit) return samples;
      const question = questionMap.get(questionId);
      if (!question || question.type !== "SCALE") continue;
      const title = String(question.text ?? "").trim();
      if (!title || seen.has(title)) continue;
      const raw = (answer as any)?.scaleValue ?? (answer as any)?.value;
      const numeric = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(numeric)) continue;
      samples.push({
        question: title,
        value: Number(numeric.toFixed(1)),
        driverKey: question.driverKey ?? question.driverTag ?? null,
        polarity: question.polarity ?? null,
      });
      seen.add(title);
    }
  }

  return samples;
}

async function getOrgSettings(orgId: string) {
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { timezone: true, defaultLanguage: true },
  });
  return {
    timezone: settings?.timezone ?? "UTC",
    defaultLanguage: normalizeLocale(settings?.defaultLanguage ?? "en"),
  };
}

function mapDriverToDimension(driverKey?: string | null) {
  return mapDriverKeyToDimension(driverKey) ?? "other";
}

function mapQuestionTypeToDb(type: string) {
  if (type === "scale") return "SCALE";
  if (type === "text") return "TEXT";
  if (type === "single_choice") return "SingleChoice";
  return "MultiChoice";
}

async function ensureSeedTemplate(orgId: string, dayIndex: number, locale: "ru" | "en") {
  const existing = await prisma.surveyTemplate.findFirst({
    where: { orgId, dayIndex, source: "seed", language: locale },
    include: { questions: true },
  });
  if (existing) return existing;

  const day = STRESS_QUESTION_DAYS[dayIndex - 1];
  if (!day) return null;
  const label = locale === "ru" ? day.labelRu ?? day.label : day.labelEn ?? day.label;
  const title = `Day ${dayIndex} · ${label}`;

  return prisma.surveyTemplate.create({
    data: {
      orgId,
      name: title,
      title,
      description: locale === "ru" ? "Ежедневный стресс-опрос" : "Daily stress pulse",
      language: locale,
      source: "seed",
      dayIndex,
      questions: {
        create: day.questions.map((q, idx) => ({
          order: idx + 1,
          text: getLocalizedQuestionText(q, locale),
          description: null,
          helpText: null,
          type: "SCALE",
          scaleMin: 0,
          scaleMax: 10,
          dimension: mapDriverToDimension(q.driverKey),
          driverTag: q.driverTag ?? q.driverKey,
          driverKey: q.driverKey,
          polarity: q.polarity,
          needsReview: false,
          aiReason: q.aiHint ?? null,
          required: true,
        })),
      },
    },
    include: { questions: true },
  });
}

async function ensureSeedTemplateFallback(orgId: string, dayIndex: number, locale: "ru" | "en") {
  if (dayIndex <= STRESS_QUESTION_DAYS.length) {
    return ensureSeedTemplate(orgId, dayIndex, locale);
  }
  const existing = await prisma.surveyTemplate.findFirst({
    where: { orgId, dayIndex, source: "seed", language: locale },
    include: { questions: true },
  });
  if (existing) return existing;
  if (!STRESS_QUESTION_DAYS.length) return null;

  const fallbackIndex = ((dayIndex - 1) % STRESS_QUESTION_DAYS.length) + 1;
  const day = STRESS_QUESTION_DAYS[fallbackIndex - 1];
  if (!day) return null;
  const label = locale === "ru" ? day.labelRu ?? day.label : day.labelEn ?? day.label;
  const title = `Day ${dayIndex} · ${label}`;

  return prisma.surveyTemplate.create({
    data: {
      orgId,
      name: title,
      title,
      description: locale === "ru" ? "Ежедневный стресс-опрос" : "Daily stress pulse",
      language: locale,
      source: "seed",
      dayIndex,
      questions: {
        create: day.questions.map((q, idx) => ({
          order: idx + 1,
          text: getLocalizedQuestionText(q, locale),
          description: null,
          helpText: null,
          type: "SCALE",
          scaleMin: 0,
          scaleMax: 10,
          dimension: mapDriverToDimension(q.driverKey),
          driverTag: q.driverTag ?? q.driverKey,
          driverKey: q.driverKey,
          polarity: q.polarity,
          needsReview: false,
          aiReason: q.aiHint ?? null,
          required: true,
        })),
      },
    },
    include: { questions: true },
  });
}

async function ensureUniqueSeedTemplateForMember(
  orgId: string,
  memberId: string,
  dayIndex: number,
  locale: "ru" | "en"
) {
  const existing = await prisma.surveyTemplate.findFirst({
    where: { orgId, dayIndex, source: "seed", language: locale, createdForMemberId: memberId },
    include: { questions: true },
  });
  if (existing) return existing;
  if (!STRESS_QUESTION_DAYS.length) return null;

  const usedTexts = await getMemberDailyQuestionTexts(memberId);

  const pool = STRESS_QUESTION_DAYS.flatMap((day) => day.questions).map((q) => ({
    question: q,
    text: getLocalizedQuestionText(q, locale).trim(),
  }));

  const uniquePoolMap = new Map<string, StressQuestion>();
  pool.forEach(({ question, text }) => {
    if (!text || usedTexts.has(text)) return;
    if (!uniquePoolMap.has(text)) uniquePoolMap.set(text, question);
  });
  const uniquePool = Array.from(uniquePoolMap.values());
  if (uniquePool.length < QUESTIONS_PER_SURVEY) return null;

  const seed = hashString(`${memberId}:${dayIndex}:${locale}`);
  const selected = seededShuffle(uniquePool, seed).slice(0, QUESTIONS_PER_SURVEY);
  const title = locale === "ru" ? `День ${dayIndex} · Новый опрос` : `Day ${dayIndex} · New survey`;

  return prisma.surveyTemplate.create({
    data: {
      orgId,
      name: title,
      title,
      description: locale === "ru" ? "Ежедневный стресс-опрос" : "Daily stress pulse",
      language: locale,
      source: "seed",
      dayIndex,
      createdForMemberId: memberId,
      questions: {
        create: selected.map((q, idx) => ({
          order: idx + 1,
          text: getLocalizedQuestionText(q, locale),
          description: null,
          helpText: null,
          type: "SCALE",
          scaleMin: 0,
          scaleMax: 10,
          dimension: mapDriverToDimension(q.driverKey),
          driverTag: q.driverTag ?? q.driverKey,
          driverKey: q.driverKey,
          polarity: q.polarity,
          needsReview: false,
          aiReason: q.aiHint ?? null,
          required: true,
        })),
      },
    },
    include: { questions: true },
  });
}

async function buildGenerationContext(memberId: string, locale: "ru" | "en", anchorDate: Date): Promise<GenerationContext> {
  const currentEnd = endOfDay(anchorDate);
  const currentStart = startOfDay(addDays(currentEnd, -6));
  const previousEnd = endOfDay(addDays(currentStart, -1));
  const previousStart = startOfDay(addDays(previousEnd, -6));

  const include = { run: { include: { template: { include: { questions: true } } } } };

  const [currentResponses, previousResponses] = await Promise.all([
    prisma.surveyResponse.findMany({
      where: { memberId, submittedAt: { gte: currentStart, lte: currentEnd } },
      include,
      orderBy: { submittedAt: "desc" },
    }),
    prisma.surveyResponse.findMany({
      where: { memberId, submittedAt: { gte: previousStart, lte: previousEnd } },
      include,
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const currentStats = computeStatsForResponses(currentResponses, locale, { start: currentStart, end: currentEnd });
  const previousStats = computeStatsForResponses(previousResponses, locale, { start: previousStart, end: previousEnd });

  const keys = Object.keys(currentStats.driverAverages);
  const driverSummary = keys.map((key) => {
    const current = currentStats.driverAverages[key as keyof typeof currentStats.driverAverages];
    const previous = previousStats.driverAverages[key as keyof typeof previousStats.driverAverages];
    const currentAvg = current?.count ? current.avg : null;
    const previousAvg = previous?.count ? previous.avg : null;
    const delta = currentAvg != null && previousAvg != null ? Number((currentAvg - previousAvg).toFixed(2)) : null;
    return {
      key,
      avg: currentAvg != null ? Number(currentAvg.toFixed(2)) : null,
      delta,
      count: current?.count ?? 0,
    };
  });

  const recentRuns = await prisma.surveyRun.findMany({
    where: { memberId, runType: "daily" },
    include: { template: { include: { questions: true } } },
    orderBy: { runDate: "desc" },
    take: 7,
  });
  const recentQuestions = Array.from(
    new Set(
      recentRuns.flatMap((run) => run.template?.questions?.map((q) => q.text).filter(Boolean) ?? [])
    )
  ).slice(0, 12);

  const missingDrivers = driverSummary.filter((d) => d.count < 3).map((d) => d.key);
  const recentAnswerSamples = extractRecentAnswerSamples([...currentResponses, ...previousResponses], 6);

  return {
    locale,
    dayIndex: recentRuns.length + 1,
    recentQuestions,
    recentAnswerSamples,
    driverSummary,
    missingDrivers,
  };
}

async function generateAiQuestions(
  context: GenerationContext,
  modelOverride?: string,
  options?: GenerateAiQuestionsOptions
) {
  const locale = context.locale;
  const driverKeysList = AI_DRIVER_KEYS.join(", ");
  const targetCount = Math.max(1, options?.count ?? QUESTIONS_PER_SURVEY);
  const avoidQuestions = Array.from(
    new Set([...(context.recentQuestions ?? []), ...(options?.existingQuestions ?? [])])
  ).slice(0, 20);
  const fillOnly = Boolean(options?.fillOnly);
  const requirementsRu = [
    "- 1 общий стресс-рейтинг 0-10 (type: scale).",
    "- 6-8 вопросов по драйверам (scale 0-10).",
    "- 1-2 открытых вопроса (type: text).",
    "- 1 вопрос «что бы помогло» (type: single_choice) + опции 4-6 вариантов.",
  ].join("\n");
  const requirementsEn = [
    "- 1 overall stress rating 0-10 (type: scale).",
    "- 6-8 driver questions (scale 0-10).",
    "- 1-2 open text questions (type: text).",
    "- 1 \"what would help\" question (type: single_choice) + 4-6 options.",
  ].join("\n");
  const systemPrompt =
    locale === "ru"
      ? "Ты HR-аналитик. Сформируй ежедневный стресс-опрос. Не выдумывай факты. Верни строго JSON по схеме."
      : "You are an HR analyst. Build a daily stress pulse survey. Do not invent facts. Return strict JSON matching the schema.";

  const userPrompt =
    locale === "ru"
      ? `${fillOnly ? `Нужно добить опрос. Сгенерируй ещё ${targetCount} НОВЫХ вопросов.` : `Сформируй ${targetCount} вопросов. Требования:`}
${fillOnly ? "" : requirementsRu}
- Не повторяй вопросы из списка recentQuestions.
- Вопросы короткие, 1-2 предложения.
- Язык вопросов: только русский.
- Типы только: scale, text, single_choice, multi_choice.
- Если сомневаешься в driverKey/polarity, поставь needsReview=true.
- reason: максимально коротко (3-8 слов).

Для каждого вопроса верни:
- driverKey: один из [${driverKeysList}]
- polarity: NEGATIVE (согласие повышает стресс) или POSITIVE (согласие снижает стресс)
- reason: коротко, почему выбран driverKey/polarity
- needsReview: true если не уверен в driverKey/polarity

Данные по драйверам (avg, delta, count): ${JSON.stringify(context.driverSummary)}
Мало данных по драйверам: ${JSON.stringify(context.missingDrivers)}
recentAnswers: ${JSON.stringify(context.recentAnswerSamples)}
recentQuestions: ${JSON.stringify(avoidQuestions)}
Верни JSON: {"questions": [{"type":"scale","title":"...","description":"...","options":["..."],"driverKey":"workload_deadlines","polarity":"NEGATIVE","reason":"...","needsReview":false,"required":true}]}`
      : `${fillOnly ? `Fill the survey. Generate ${targetCount} NEW questions.` : `Build ${targetCount} questions. Requirements:`}
${fillOnly ? "" : requirementsEn}
- Avoid repeating recentQuestions.
- Keep questions short (1-2 sentences).
- Language: English only.
- Types only: scale, text, single_choice, multi_choice.
- If unsure about driverKey/polarity, set needsReview=true.
- reason: keep it very short (3-8 words).

For each question return:
- driverKey: one of [${driverKeysList}]
- polarity: NEGATIVE (agreement increases stress) or POSITIVE (agreement decreases stress)
- reason: short explanation for driverKey/polarity
- needsReview: true if unsure about driverKey/polarity

Driver data (avg, delta, count): ${JSON.stringify(context.driverSummary)}
Low-coverage drivers: ${JSON.stringify(context.missingDrivers)}
recentAnswers: ${JSON.stringify(context.recentAnswerSamples)}
recentQuestions: ${JSON.stringify(avoidQuestions)}
Return JSON: {"questions": [{"type":"scale","title":"...","description":"...","options":["..."],"driverKey":"workload_deadlines","polarity":"NEGATIVE","reason":"...","needsReview":false,"required":true}]}`;

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = modelOverride ?? env.AI_MODEL_SUMMARY ?? "gpt-5-mini";

  const response = await client.responses.create({
    model,
    instructions: systemPrompt,
    input: [{ role: "user", content: userPrompt }],
    max_output_tokens: 3600,
    text: { format: { type: "json_object" } },
  });

  const text = extractOutputText(response);
  if (!text) {
    if ((response as any)?.status === "incomplete") {
      throw new Error("AI response incomplete");
    }
    throw new Error("AI returned empty response");
  }
  const json = parseJsonFromText(text);
  return AI_SURVEY_SCHEMA.parse(json).questions;
}

function extractOutputText(response: any) {
  if (!response) return "";
  if (typeof response.output_text === "string") return response.output_text;
  const output = response.output;
  if (!Array.isArray(output)) return "";
  for (const item of output) {
    if (item?.type !== "message") continue;
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    const part = content.find((c: any) =>
      (c?.type === "output_text" || c?.type === "text") && typeof c?.text === "string"
    );
    if (part?.text) return part.text;
    const jsonPart = content.find((c: any) => c?.type === "json" && c?.json);
    if (jsonPart?.json) return JSON.stringify(jsonPart.json);
  }
  return "";
}

function parseJsonFromText(text: string) {
  const trimmed = text.trim().replace(/```json|```/gi, "").trim();
  const candidates: string[] = [];
  if (trimmed) {
    candidates.push(trimmed);
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    candidates.push(trimmed.slice(first, last + 1));
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }
  throw new Error("No JSON object found in AI response");
}

function normalizeAiQuestion(
  question: z.infer<typeof AI_QUESTION_SCHEMA>,
  locale: "ru" | "en"
) {
  const normalizeQuestionType = (rawType?: string | null) => {
    const normalized = String(rawType ?? "").toLowerCase().trim();
    if (normalized.includes("single")) return "single_choice";
    if (normalized.includes("multi")) return "multi_choice";
    if (normalized.includes("text") || normalized.includes("open")) return "text";
    return "scale";
  };
  const normalizeOptions = (raw: unknown) => {
    if (Array.isArray(raw)) {
      const cleaned = raw.map((item) => String(item ?? "").trim()).filter(Boolean);
      return cleaned.length ? cleaned : null;
    }
    if (typeof raw === "string") {
      const cleaned = raw
        .split(/[;,]\s*/g)
        .map((item) => item.trim())
        .filter(Boolean);
      return cleaned.length ? cleaned : null;
    }
    return null;
  };

  const normalizedType = normalizeQuestionType(question.type);
  const resolvedOptions = normalizeOptions(question.options);
  const isScale = normalizedType === "scale";
  const isChoice = normalizedType === "single_choice" || normalizedType === "multi_choice";
  const resolvedDriverKey = normalizeDriverKey(question.driverKey) ?? "unknown";
  const resolvedPolarity = normalizePolarity(question.polarity);
  let needsReview = Boolean(question.needsReview);

  if (isScale) {
    if (!normalizeDriverKey(question.driverKey)) {
      needsReview = true;
    }
    if (!question.polarity || !["NEGATIVE", "POSITIVE"].includes(String(question.polarity).toUpperCase())) {
      needsReview = true;
    }
    if (resolvedDriverKey === "unknown") {
      needsReview = true;
    }
  } else if (isChoice && !resolvedOptions) {
    needsReview = true;
  }

  if (needsReview) {
    if (env.isDev || process.env.AI_DEBUG === "1") {
      console.warn("AI question needs review", {
        locale,
        type: normalizedType,
        title: question.title,
        driverKey: resolvedDriverKey,
        polarity: resolvedPolarity,
        reason: question.reason ?? null,
      });
    }
  }

  return {
    ...question,
    type: normalizedType,
    options: resolvedOptions,
    driverKey: resolvedDriverKey,
    polarity: resolvedPolarity,
    needsReview,
    reason: question.reason ?? null,
  };
}

async function generateAiTemplate(orgId: string, memberId: string, dayIndex: number, locale: "ru" | "en") {
  const context = await buildGenerationContext(memberId, locale, new Date());
  const primaryModel = env.AI_MODEL_SUMMARY ?? "gpt-5-mini";
  const fallbackModel =
    env.AI_MODEL_SUMMARY_FALLBACK && env.AI_MODEL_SUMMARY_FALLBACK !== primaryModel
      ? env.AI_MODEL_SUMMARY_FALLBACK
      : null;
  const isFormatError = (error: unknown) => {
    const message = String((error as Error)?.message ?? "");
    return (
      message.includes("AI response incomplete") ||
      message.includes("AI returned empty response") ||
      message.includes("No JSON object found") ||
      message.includes("Unterminated string in JSON")
    );
  };
  const shouldLogAiDebug = env.isDev || process.env.AI_DEBUG === "1";

  const fetchQuestions = async (options?: GenerateAiQuestionsOptions) => {
    try {
      return await generateAiQuestions({ ...context, dayIndex }, primaryModel, options);
    } catch (error) {
      if (shouldLogAiDebug && !isFormatError(error)) {
        console.warn("AI question generation failed, retrying once", error);
      }
      try {
        const retryModel = fallbackModel ?? primaryModel;
        return await generateAiQuestions({ ...context, dayIndex }, retryModel, options);
      } catch (err) {
        if (shouldLogAiDebug && !isFormatError(err)) {
          console.warn("AI question generation failed after retry", err);
        }
        return null;
      }
    }
  };

  const normalizeTitle = (title: string) => title.trim().toLowerCase().replace(/\s+/g, " ");
  const dedupeQuestions = <T extends { title: string }>(items: T[]) => {
    const seen = new Set<string>();
    const deduped: T[] = [];
    items.forEach((item) => {
      const key = normalizeTitle(item.title);
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });
    return deduped;
  };

  let questions = await fetchQuestions({ count: QUESTIONS_PER_SURVEY });
  if (!questions) {
    if (shouldLogAiDebug) {
      console.warn("AI template generation returned no questions", { orgId, memberId, dayIndex, locale });
    }
    return null;
  }
  let normalizedQuestions = dedupeQuestions(questions.map((q) => normalizeAiQuestion(q, locale)));

  if (normalizedQuestions.length < QUESTIONS_PER_SURVEY) {
    const missing = QUESTIONS_PER_SURVEY - normalizedQuestions.length;
    const existing = normalizedQuestions.map((q) => q.title);
    const filler = await fetchQuestions({ count: missing, existingQuestions: existing, fillOnly: true });
    if (filler?.length) {
      const normalizedFill = filler.map((q) => normalizeAiQuestion(q, locale));
      normalizedQuestions = dedupeQuestions([...normalizedQuestions, ...normalizedFill]);
    }
  }

  if (normalizedQuestions.length < QUESTIONS_PER_SURVEY) {
    if (shouldLogAiDebug) {
      console.warn("AI template generation incomplete", {
        orgId,
        memberId,
        dayIndex,
        locale,
        count: normalizedQuestions.length,
      });
    }
    return null;
  }
  normalizedQuestions = normalizedQuestions.slice(0, QUESTIONS_PER_SURVEY);

  const usedTexts = await getMemberDailyQuestionTexts(memberId);
  const repeated = normalizedQuestions.filter((q) => usedTexts.has(q.title.trim()));
  if (repeated.length > 0) {
    if (shouldLogAiDebug) {
      console.warn("AI template repeated previous questions, skipping", {
        orgId,
        memberId,
        dayIndex,
        locale,
        repeated: repeated.map((q) => q.title).slice(0, 5),
      });
    }
    return null;
  }

  const title = locale === "ru" ? `День ${dayIndex} · AI-опрос` : `Day ${dayIndex} · AI survey`;
  return prisma.surveyTemplate.create({
    data: {
      orgId,
      name: title,
      title,
      description: locale === "ru" ? "AI-сгенерированный ежедневный опрос" : "AI-generated daily survey",
      language: locale,
      source: "ai",
      dayIndex,
      createdForMemberId: memberId,
      questions: {
        create: normalizedQuestions.map((q, idx) => ({
          order: idx + 1,
          text: q.title,
          description: q.description ?? null,
          helpText: null,
          type: mapQuestionTypeToDb(q.type),
          scaleMin: q.type === "scale" ? 0 : null,
          scaleMax: q.type === "scale" ? 10 : null,
          dimension: mapDriverToDimension(q.driverKey),
          driverTag: q.driverKey ?? null,
          driverKey: q.driverKey ?? "unknown",
          polarity: q.polarity ?? "NEGATIVE",
          needsReview: q.needsReview ?? false,
          aiReason: q.reason ?? null,
          choices: q.options ?? null,
          required: q.required ?? true,
        })),
      },
    },
    include: { questions: true },
  });
}

export async function maybeUpgradeDailyRunToAi(
  run: {
    id: string;
    orgId: string;
    memberId: string | null;
    dayIndex: number | null;
    source?: string | null;
    template?: { language?: string | null } | null;
  },
  locale: "ru" | "en",
  allowAi: boolean
) {
  if (!run.memberId) return run;

  const responseCount = await prisma.surveyResponse.count({ where: { runId: run.id } });
  if (responseCount > 0) return run;

  const dayIndex = run.dayIndex ?? SEED_DAYS + 1;
  if (!allowAi) return null;
  const templateLanguage = run.template?.language ?? null;
  if (run.source === "ai" && (!templateLanguage || templateLanguage === locale)) return run;

  const template = await generateAiTemplate(run.orgId, run.memberId, dayIndex, locale);
  if (!template) return null;
  if (templateLanguage && templateLanguage === locale && run.source === "ai") return run;

  return prisma.surveyRun.update({
    where: { id: run.id },
    data: {
      templateId: template.id,
      title: template.title,
      source: "ai",
    },
    include: { template: { include: { questions: true } } },
  });
}

export async function getOrCreateDailySurveyRun(options: {
  memberId: string;
  date?: Date;
  locale?: "ru" | "en";
  allowAi?: boolean;
  timeZone?: string;
  createdByUserId?: string | null;
  allowMultiplePerDay?: boolean;
}) {
  const { memberId } = options;
  const date = options.date ?? new Date();
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { organization: true },
  });
  if (!member) return null;

  const settings = await getOrgSettings(member.organizationId);
  const timeZone = options.timeZone ?? settings.timezone;
  const locale = normalizeLocale(options.locale ?? settings.defaultLanguage);

  const dateKey = getDateKey(date, timeZone);
  const allowMultiplePerDay = Boolean(options.allowMultiplePerDay);
  const runDate = allowMultiplePerDay ? date : runDateFromKey(dateKey);

  let allowAi = options.allowAi;
  if (allowAi === undefined) {
    const gateStatus = await getBillingGateStatus(member.organizationId, member.organization?.createdAt ?? null);
    allowAi = gateStatus.hasPaidAccess || env.isDev;
  }

  if (!allowMultiplePerDay) {
    const existing = await prisma.surveyRun.findFirst({
      where: { memberId, runDate, runType: "daily" },
      include: { template: { include: { questions: true } }, responses: { select: { id: true } } },
    });
    if (existing) {
      return maybeUpgradeDailyRunToAi(existing, locale, allowAi);
    }
  }

  const priorRuns = allowMultiplePerDay
    ? await prisma.surveyRun.count({ where: { memberId, runType: "daily" } })
    : await prisma.surveyRun.count({
        where: { memberId, runType: "daily", runDate: { lt: runDate } },
      });
  const dayIndex = Math.max(1, priorRuns + 1);

  let template = null;
  let source: "seed" | "ai" = "seed";
  try {
    if (!allowAi) return null;
    source = "ai";
    template = await generateAiTemplate(member.organizationId, memberId, dayIndex, locale);
    if (!template) return null;
  } catch (error) {
    await prisma.surveyGenerationLog.create({
      data: {
        orgId: member.organizationId,
        memberId: member.id,
        runDate,
        source: "ai",
        dayIndex,
        status: "failed",
        error: String((error as Error)?.message ?? error),
      },
    });
    return null;
  }

  if (!template) return null;

  const launchedByUserId =
    options.createdByUserId ??
    member.userId ??
    (await prisma.user.findFirst({
      where: { organizationId: member.organizationId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }))?.id;

  if (!launchedByUserId) return null;

  try {
    const runData = {
      orgId: member.organizationId,
      teamId: member.teamId,
      memberId: member.id,
      templateId: template.id,
      title: template.title,
      launchedByUserId,
      launchedAt: new Date(),
      runDate,
      runType: "daily" as const,
      source,
      dayIndex,
      targetCount: 1,
    };
    const created = await prisma.surveyRun.createMany({
      data: [runData],
      skipDuplicates: true,
    });
    const run = await prisma.surveyRun.findFirst({
      where: { memberId: member.id, runDate, runType: "daily" },
      include: { template: { include: { questions: true } } },
    });
    if (!run) {
      throw new Error("Failed to create survey run");
    }

    if (created.count > 0) {
      await prisma.surveyGenerationLog.create({
        data: {
          orgId: member.organizationId,
          memberId: member.id,
          runDate,
          source,
          dayIndex,
          status: "success",
          surveyRunId: run.id,
          templateId: template.id,
        },
      });
    }

    if (member.userId) {
      await createNotification({
        organizationId: member.organizationId,
        userId: member.userId,
        type: "DAILY_SURVEY_READY",
        title: locale === "ru" ? "Новый опрос на сегодня" : "New daily survey",
        body: locale === "ru" ? "Доступен новый стресс-опрос за сегодня." : "Your daily stress pulse is ready.",
        link: "/app/my/stress-survey",
      });
    }

    return run;
  } catch (error) {
    const existingAfter = await prisma.surveyRun.findFirst({
      where: { memberId, runDate, runType: "daily" },
      include: { template: { include: { questions: true } } },
    });
    if (existingAfter) return existingAfter;

    await prisma.surveyGenerationLog.create({
      data: {
        orgId: member.organizationId,
        memberId: member.id,
        runDate,
        source,
        dayIndex,
        status: "failed",
        error: String(error?.message ?? error),
      },
    });

    throw error;
  }
}

export async function serializeDailySurvey(run: any): Promise<DailySurveyPayload> {
  return {
    runId: run.id,
    runDate: run.runDate?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    title: run.title,
    dayIndex: run.dayIndex ?? null,
    source: (run.source ?? "manual") as "seed" | "ai" | "manual",
    questions: (run.template?.questions ?? []).map((q: any) => ({
      id: q.id,
      order: q.order,
      text: q.text,
      description: q.description ?? null,
      helpText: q.helpText ?? null,
      type: q.type,
      dimension: q.dimension ?? null,
      choices: q.choices ?? null,
      scaleMin: q.scaleMin ?? null,
      scaleMax: q.scaleMax ?? null,
      driverTag: q.driverTag ?? null,
      driverKey: q.driverKey ?? null,
      polarity: q.polarity ?? null,
      needsReview: q.needsReview ?? null,
      aiReason: q.aiReason ?? null,
      required: q.required ?? true,
    })),
  };
}

export async function getDailySurveyForMember(memberId: string, date: Date, locale?: "ru" | "en") {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return null;
  const settings = await getOrgSettings(member.organizationId);
  const dateKey = getDateKey(date, settings.timezone);
  const runDate = runDateFromKey(dateKey);
  const run = await prisma.surveyRun.findFirst({
    where: { memberId, runDate, runType: "daily" },
    include: { template: { include: { questions: true } } },
  });
  if (!run) return null;
  return serializeDailySurvey(run);
}

export async function getDailySurveyHistory(memberId: string, take = 20) {
  const runs = await prisma.surveyRun.findMany({
    where: { memberId, runType: "daily" },
    include: { responses: true },
    orderBy: { runDate: "desc" },
    take,
  });

  return runs
    .filter((run) => run.responses.length)
    .map((run) => {
      const response = run.responses[0];
      const startedAt = run.launchedAt;
      const finishedAt = response?.submittedAt ?? run.launchedAt;
      const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
      return {
        id: run.id,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs,
        score: run.avgStressIndex ?? 0,
      };
    });
}

export async function recomputeTeamMetricsForDailyRun(teamId: string, runDate: Date, orgId: string) {
  const responses = await prisma.surveyResponse.findMany({
    where: {
      run: { orgId, teamId, runType: "daily", runDate },
    },
    include: { run: { include: { template: { include: { questions: true } } } } },
  });

  if (!responses.length) return null;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  const range = { start: startOfDay(runDate), end: endOfDay(runDate) };
  const stats = computeStatsForResponses(responses, "en", range);
  const stressIndex = stats.stressCount ? stats.stressAvg : stats.overallAvg;
  const engagementScore = stats.engagementCount ? stats.engagementAvg : 0;
  const memberCount = team?.memberCount ?? responses.length;
  const participation = memberCount
    ? Math.min(100, Math.round((responses.length / memberCount) * 100))
    : responses.length;

  return { stressIndex, engagementScore, participation };
}
