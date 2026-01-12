export const DRIVER_KEYS = [
  "workload_deadlines",
  "clarity_priorities",
  "manager_support",
  "meetings_focus",
  "psychological_safety",
  "recovery_energy",
  "autonomy_control",
  "recognition_feedback",
  "process_clarity",
  "long_term_outlook",
  "unknown",
] as const;

export type DriverKey = (typeof DRIVER_KEYS)[number];
export type QuestionPolarity = "NEGATIVE" | "POSITIVE";

const KNOWN_DRIVER_KEYS = new Set<DriverKey>(DRIVER_KEYS.filter((key) => key !== "unknown"));

const LEGACY_DRIVER_MAP: Record<string, DriverKey> = {
  workload: "workload_deadlines",
  load: "workload_deadlines",
  deadlines: "workload_deadlines",
  clarity: "clarity_priorities",
  priorities: "clarity_priorities",
  manager_support: "manager_support",
  support: "manager_support",
  meetings_focus: "meetings_focus",
  meetings: "meetings_focus",
  focus: "meetings_focus",
  psych_safety: "psychological_safety",
  safety: "psychological_safety",
  atmosphere: "psychological_safety",
  balance: "recovery_energy",
  stress: "recovery_energy",
  recovery: "recovery_energy",
  energy: "recovery_energy",
  autonomy: "autonomy_control",
  control: "autonomy_control",
  recognition: "recognition_feedback",
  feedback: "recognition_feedback",
  processes: "process_clarity",
  process: "process_clarity",
  long_term: "long_term_outlook",
  outlook: "long_term_outlook",
  growth: "long_term_outlook",
  engagement: "autonomy_control",
};

export const DRIVER_KEY_TO_DIMENSION: Record<DriverKey, string> = {
  workload_deadlines: "workload",
  clarity_priorities: "clarity",
  manager_support: "recognition",
  meetings_focus: "engagement",
  psychological_safety: "psych_safety",
  recovery_energy: "stress",
  autonomy_control: "engagement",
  recognition_feedback: "recognition",
  process_clarity: "clarity",
  long_term_outlook: "engagement",
  unknown: "other",
};

export function normalizePolarity(value?: string | null): QuestionPolarity {
  if (!value) return "NEGATIVE";
  const normalized = String(value).toUpperCase();
  return normalized === "POSITIVE" ? "POSITIVE" : "NEGATIVE";
}

export function normalizeDriverKey(value?: string | null): DriverKey | null {
  if (!value) return null;
  const normalized = String(value).toLowerCase().trim();
  const direct = DRIVER_KEYS.find((key) => key === normalized);
  if (direct) return direct;
  return LEGACY_DRIVER_MAP[normalized] ?? null;
}

export function resolveDriverKey(question?: { driverKey?: string | null; driverTag?: string | null; dimension?: string | null }): DriverKey {
  const fromKey = normalizeDriverKey(question?.driverKey);
  if (fromKey) return fromKey;
  const fromTag = normalizeDriverKey(question?.driverTag);
  if (fromTag) return fromTag;
  const fromDimension = normalizeDriverKey(question?.dimension);
  if (fromDimension) return fromDimension;
  return "unknown";
}

export function mapDriverKeyToDimension(driverKey?: string | null) {
  const resolved = normalizeDriverKey(driverKey) ?? "unknown";
  return DRIVER_KEY_TO_DIMENSION[resolved];
}

export function resolveScaleBounds(
  question?: { type?: string | null; scaleMin?: number | null; scaleMax?: number | null },
  answer?: { type?: string | null }
) {
  const scaleMin = question?.scaleMin ?? null;
  const scaleMax = question?.scaleMax ?? null;
  if (scaleMin != null && scaleMax != null && scaleMax !== scaleMin) {
    return { min: scaleMin, max: scaleMax };
  }
  const type = String(answer?.type ?? question?.type ?? "").toLowerCase();
  if (type.includes("1_5") || type.includes("1-5")) {
    return { min: 1, max: 5 };
  }
  if (type.includes("0_10") || type.includes("0-10")) {
    return { min: 0, max: 10 };
  }
  return { min: 0, max: 10 };
}

export function normalizeScaleValue(
  rawValue: number,
  question?: { type?: string | null; scaleMin?: number | null; scaleMax?: number | null },
  answer?: { type?: string | null }
) {
  const { min, max } = resolveScaleBounds(question, answer);
  if (max === min) return clamp(rawValue, 0, 10);
  const normalized = ((rawValue - min) / (max - min)) * 10;
  return clamp(normalized, 0, 10);
}

export function extractScaleValue(answer: unknown): number | null {
  if (answer == null) return null;
  if (typeof answer === "number") {
    return Number.isFinite(answer) ? answer : null;
  }
  if (typeof answer === "string") {
    const numeric = Number(answer);
    return Number.isFinite(numeric) ? numeric : null;
  }
  if (typeof answer !== "object") return null;
  const record = answer as Record<string, unknown>;
  const raw = record.scaleValue ?? record.value;
  if (raw == null) return null;
  const numeric = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

export function getStressScore(rawValue: number, polarity: QuestionPolarity) {
  const safe = clamp(rawValue, 0, 10);
  return polarity === "POSITIVE" ? clamp(10 - safe, 0, 10) : safe;
}

export function getEngagementScore(rawValue: number, polarity: QuestionPolarity) {
  const safe = clamp(rawValue, 0, 10);
  return polarity === "POSITIVE" ? safe : clamp(10 - safe, 0, 10);
}

export function scoreAnswer(
  answer: unknown,
  question?: {
    polarity?: string | null;
    driverKey?: string | null;
    driverTag?: string | null;
    dimension?: string | null;
    type?: string | null;
    scaleMin?: number | null;
    scaleMax?: number | null;
  }
) {
  const raw = extractScaleValue(answer);
  if (raw == null) return null;
  const answerMeta =
    typeof answer === "object" && answer !== null ? (answer as { type?: string | null }) : undefined;
  const normalized = normalizeScaleValue(raw, question, answerMeta);
  const polarity = normalizePolarity(question?.polarity);
  return {
    normalized,
    polarity,
    stressScore: getStressScore(normalized, polarity),
    engagementScore: getEngagementScore(normalized, polarity),
    driverKey: resolveDriverKey(question),
    dimension: question?.dimension ? String(question.dimension).toLowerCase() : null,
  };
}

export function computeOverallStressFromDrivers(driverTotals: Map<DriverKey, { sum: number; count: number }>) {
  let sumDrivers = 0;
  let driverCount = 0;
  let answerCount = 0;
  for (const [key, totals] of driverTotals.entries()) {
    if (!KNOWN_DRIVER_KEYS.has(key)) continue;
    if (!totals.count) continue;
    sumDrivers += totals.sum / totals.count;
    driverCount += 1;
    answerCount += totals.count;
  }
  return {
    avg: driverCount ? sumDrivers / driverCount : 0,
    driverCount,
    answerCount,
  };
}

export function isKnownDriverKey(key: DriverKey) {
  return KNOWN_DRIVER_KEYS.has(key);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
