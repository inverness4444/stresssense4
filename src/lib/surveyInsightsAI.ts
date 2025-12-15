import { sanitizeTextForAI } from "@/lib/aiPrivacy";
import { getAIClient } from "@/lib/ai";

type TimeseriesInput = { date: string; baseScore: number; responsesCount: number };

export async function analyseEngagementWithAI(input: {
  numericSamples: number[];
  textSamples: string[];
  questionMeta?: unknown;
  baseScore: number;
  timeseries: TimeseriesInput[];
}) {
  const client = getAIClient();
  const sanitizedText = input.textSamples.map((t) => sanitizeTextForAI(t)).slice(0, 50);
  const prompt = `
You are helping compute an engagement score (0-10) based on survey responses.
Base score: ${input.baseScore.toFixed(2)}.
Numeric sample count: ${input.numericSamples.length}.
Provide a small JSON with keys:
  adjustedScore (0-10, keep within +/-1 of baseScore),
  drivers (array of 3-5 short tags),
  adjustedTimeseries (array of {date, score} using the provided dates, smoothed).
Return JSON only.`;

  try {
    const resp = await client.summarize({
      prompt: prompt + `\nDates: ${input.timeseries.map((t) => t.date).join(", ")}\nTexts: ${sanitizedText.join(" | ")}`.slice(0, 4000),
    });
    const parsed = safeParse(resp.text);
    if (!parsed) throw new Error("parse_failed");
    return {
      adjustedScore: clamp(parsed.adjustedScore ?? input.baseScore, input.baseScore - 1, input.baseScore + 1),
      drivers: Array.isArray(parsed.drivers) ? parsed.drivers.slice(0, 5) : [],
      adjustedTimeseries: Array.isArray(parsed.adjustedTimeseries) ? parsed.adjustedTimeseries : input.timeseries.map((t) => ({ date: t.date, score: t.baseScore })),
    };
  } catch {
    return {
      adjustedScore: input.baseScore,
      drivers: [],
      adjustedTimeseries: input.timeseries.map((t) => ({ date: t.date, score: t.baseScore })),
    };
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
