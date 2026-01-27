"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { t, type Locale } from "@/lib/i18n";
import { computeOverallStressFromDrivers, scoreAnswer, type DriverKey } from "@/lib/stressScoring";
import { getTodayDailySurvey, submitDailySurvey } from "@/app/app/my/stress-survey/actions";

type DailySurveyQuestion = {
  id: string;
  order: number;
  text: string;
  description?: string | null;
  helpText?: string | null;
  type: string;
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

type DailySurveyPayload = {
  runId: string;
  runDate: string;
  title: string;
  dayIndex: number | null;
  source: "seed" | "ai" | "manual";
  questions: DailySurveyQuestion[];
};

type SurveyContextValue = {
  open: boolean;
  openSurvey: () => void;
  closeSurvey: () => void;
};

type Props = { children: React.ReactNode; locale: Locale; userId?: string; userEmail?: string | null };

type AnswerValue = number | string | string[] | null;

type QuestionKind = "scale" | "single" | "multi" | "text";

type StressLevel = "low" | "mid" | "high";

const SurveyContext = createContext<SurveyContextValue | null>(null);

export function useSelfStressSurvey() {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error("SelfStressSurveyProvider missing");
  return ctx;
}

function normalizeQuestionKind(type?: string | null): QuestionKind {
  const normalized = String(type ?? "").toLowerCase();
  if (normalized.includes("single")) return "single";
  if (normalized.includes("multi")) return "multi";
  if (normalized.includes("text")) return "text";
  return "scale";
}

function getScaleBounds(question: DailySurveyQuestion) {
  const type = String(question.type ?? "").toLowerCase();
  if (question.scaleMin != null && question.scaleMax != null) {
    return { min: question.scaleMin, max: question.scaleMax };
  }
  if (type.includes("1_5") || type.includes("1-5")) {
    return { min: 1, max: 5 };
  }
  return { min: 0, max: 10 };
}

function isAnswered(value: AnswerValue) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function SelfStressSurveyProvider({ children, locale }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerValue[]>([]);
  const [finished, setFinished] = useState(false);
  const [survey, setSurvey] = useState<DailySurveyPayload | null>(null);
  const [serverAverage, setServerAverage] = useState<number | null>(null);

  const questions = survey?.questions ?? [];
  const isLastStep = questions.length > 0 && step === questions.length - 1;
  const currentQuestion = questions[step];
  const currentKind = currentQuestion ? normalizeQuestionKind(currentQuestion.type) : "scale";
  const progressLabel = questions.length ? `${step + 1}/${questions.length}` : "—";

  const loadSurvey = async () => {
    setLoading(true);
    setError(null);
    try {
      const todaySurvey = await getTodayDailySurvey();
      if (!todaySurvey) {
        setError(t(locale, "selfSurveyUnavailable"));
        setSurvey(null);
        return;
      }
      setSurvey(todaySurvey as DailySurveyPayload);
      setAnswers(Array(todaySurvey.questions.length).fill(null));
      setStep(0);
      setFinished(false);
      setServerAverage(null);
    } catch (err) {
      console.error("Failed to load daily survey", err);
      setError(t(locale, "selfSurveyLoadFailed"));
      setSurvey(null);
    } finally {
      setLoading(false);
    }
  };

  const openSurvey = () => {
    setOpen(true);
    loadSurvey();
  };

  const closeSurvey = () => {
    setOpen(false);
    setFinished(false);
    setStep(0);
    setError(null);
    setServerAverage(null);
  };

  useEffect(() => {
    const handler = () => {
      openSurvey();
    };
    window.addEventListener("open-self-stress-survey", handler);
    return () => window.removeEventListener("open-self-stress-survey", handler);
  }, []);

  const setAnswer = (value: AnswerValue) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  };

  const toggleMultiAnswer = (value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      const current = Array.isArray(next[step]) ? (next[step] as string[]) : [];
      if (current.includes(value)) {
        next[step] = current.filter((item) => item !== value);
      } else {
        next[step] = [...current, value];
      }
      return next;
    });
  };

  const stressStats = useMemo(() => {
    const driverTotals = new Map<DriverKey, { sum: number; count: number }>();
    let fallbackSum = 0;
    let fallbackCount = 0;

    questions.forEach((q, idx) => {
      const kind = normalizeQuestionKind(q.type);
      if (kind !== "scale") return;
      const bounds = getScaleBounds(q);
      const value = answers[idx];
      const numeric =
        typeof value === "number" && Number.isFinite(value)
          ? value
          : Math.round((bounds.min + bounds.max) / 2);
      const scored = scoreAnswer({ scaleValue: numeric, type: q.type }, q);
      if (!scored) return;

      fallbackSum += scored.stressScore;
      fallbackCount += 1;

      const totals = driverTotals.get(scored.driverKey) ?? { sum: 0, count: 0 };
      totals.sum += scored.stressScore;
      totals.count += 1;
      driverTotals.set(scored.driverKey, totals);
    });

    const stressTotals = computeOverallStressFromDrivers(driverTotals);
    const overallAvg = fallbackCount ? fallbackSum / fallbackCount : 0;
    const avg = stressTotals.answerCount > 0 ? stressTotals.avg : overallAvg;
    return { avg, overallAvg, count: fallbackCount };
  }, [questions, answers]);

  const average = stressStats.avg;
  const displayAverage = serverAverage ?? average;
  const level: StressLevel = displayAverage >= 7 ? "high" : displayAverage > 3 ? "mid" : "low";

  const summaryText =
    level === "high"
      ? t(locale, "selfSurveySummaryHigh")
      : level === "mid"
        ? t(locale, "selfSurveySummaryMid")
        : t(locale, "selfSurveySummaryLow");

  const handleCompleteSurvey = async () => {
    if (!survey) return;
    const payloadAnswers = questions.map((q, idx) => {
      const kind = normalizeQuestionKind(q.type);
      const value = answers[idx];
      if (kind === "scale") {
        const bounds = getScaleBounds(q);
        const numeric = typeof value === "number" && Number.isFinite(value)
          ? value
          : Math.round((bounds.min + bounds.max) / 2);
        return { questionId: q.id, type: q.type, scaleValue: numeric };
      }
      if (kind === "single") {
        return { questionId: q.id, type: q.type, textValue: typeof value === "string" ? value : "" };
      }
      if (kind === "multi") {
        const selected = Array.isArray(value) ? value : [];
        return { questionId: q.id, type: q.type, textValue: selected.join(", "), selectedOptions: selected };
      }
      return { questionId: q.id, type: q.type, textValue: typeof value === "string" ? value : "" };
    });

    try {
      const result = await submitDailySurvey({
        runId: survey.runId,
        answers: payloadAnswers,
        completedAt: new Date().toISOString(),
      });
      if (typeof result?.stressIndex === "number") {
        setServerAverage(result.stressIndex);
      }
      router.refresh();
    } catch (err) {
      console.error("Failed to submit daily survey", err);
      setError(t(locale, "selfSurveySubmitFailed"));
      return;
    }

    setFinished(true);
  };

  const onNext = () => {
    if (!questions.length) return;
    if (isLastStep) {
      handleCompleteSurvey();
      return;
    }
    setStep((s) => Math.min(s + 1, questions.length - 1));
  };
  const onPrev = () => setStep((s) => Math.max(0, s - 1));

  const canContinue = currentQuestion?.required ? isAnswered(answers[step]) : true;

  const value = useMemo(
    () => ({
      open,
      openSurvey,
      closeSurvey,
    }),
    [open]
  );

  return (
    <SurveyContext.Provider value={value}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <button
              onClick={closeSurvey}
              className="absolute right-4 top-4 rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              aria-label={t(locale, "selfSurveyCloseAria")}
            >
              ✕
            </button>

            {loading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 py-16 text-center shadow-sm">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{t(locale, "selfSurveyLoading")}</p>
                  <p className="text-xs text-slate-500">{t(locale, "selfSurveyLoadingHint")}</p>
                </div>
              </div>
            )}

            {!loading && error && !survey && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                <h2 className="text-xl font-semibold text-slate-900">{t(locale, "selfSurveyUnavailableTitle")}</h2>
                <p className="text-sm text-slate-600 max-w-md">{error}</p>
                <button
                  onClick={closeSurvey}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  {t(locale, "selfSurveyBack")}
                </button>
              </div>
            )}

            {!loading && survey && !finished ? (
              <>
                <div className="text-center space-y-3 px-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {t(locale, "selfSurveyBadge")}
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-900">{currentQuestion?.text}</h2>
                  {currentQuestion?.description && (
                    <p className="text-sm text-slate-600">{currentQuestion.description}</p>
                  )}
                  <p className="text-sm text-slate-600">
                    {t(locale, "selfSurveySafe")}
                  </p>
                </div>

                {currentKind === "scale" && currentQuestion && (
                  <div className="mt-6 flex flex-col items-center gap-3 px-4">
                    <div className="flex w-full max-w-2xl items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500">
                        {t(locale, "selfSurveyScaleMin")}
                      </span>
                      <input
                        type="range"
                        min={getScaleBounds(currentQuestion).min}
                        max={getScaleBounds(currentQuestion).max}
                        step={1}
                        value={typeof answers[step] === "number" ? (answers[step] as number) : Math.round((getScaleBounds(currentQuestion).min + getScaleBounds(currentQuestion).max) / 2)}
                        onChange={(e) => setAnswer(Number(e.target.value))}
                        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary"
                      />
                      <span className="text-xs font-semibold text-slate-500">
                        {t(locale, "selfSurveyScaleMax")}
                      </span>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                      {t(locale, "selfSurveyCurrent")}: {typeof answers[step] === "number" ? answers[step] : "—"}/{getScaleBounds(currentQuestion).max}
                    </div>
                  </div>
                )}

                {currentKind === "single" && currentQuestion && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2 px-4">
                    {(Array.isArray(currentQuestion.choices) ? currentQuestion.choices : []).map((choice) => (
                      <button
                        key={choice}
                        onClick={() => setAnswer(choice)}
                        type="button"
                        className={clsx(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition",
                          answers[step] === choice
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                )}

                {currentKind === "multi" && currentQuestion && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2 px-4">
                    {(Array.isArray(currentQuestion.choices) ? currentQuestion.choices : []).map((choice) => {
                      const selected = Array.isArray(answers[step]) && (answers[step] as string[]).includes(choice);
                      return (
                        <button
                          key={choice}
                          onClick={() => toggleMultiAnswer(choice)}
                          type="button"
                          className={clsx(
                            "rounded-full border px-4 py-2 text-sm font-semibold transition",
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentKind === "text" && (
                  <div className="mt-6 px-6">
                    <textarea
                      rows={4}
                      value={typeof answers[step] === "string" ? (answers[step] as string) : ""}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder={t(locale, "selfSurveyTextPlaceholder")}
                    />
                  </div>
                )}

                {currentQuestion?.helpText && (
                  <p className="mt-3 text-center text-xs text-slate-500">{currentQuestion.helpText}</p>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>{progressLabel}</span>
                    <div className="flex flex-1 items-center gap-1 px-4">
                      {questions.map((_, idx) => (
                        <div
                          key={idx}
                          className={clsx(
                            "h-2 flex-1 rounded-full",
                            idx === step
                              ? "bg-primary"
                              : answers[idx] != null
                                ? "bg-primary/30"
                                : "bg-slate-200"
                          )}
                        />
                      ))}
                    </div>
                    <span>{questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={onPrev}
                      disabled={step === 0}
                      className={clsx(
                        "rounded-full px-4 py-2 text-sm font-semibold",
                        step === 0
                          ? "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                          : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {t(locale, "selfSurveyPrev")}
                    </button>
                    <button
                      onClick={onNext}
                      className="rounded-full bg-gradient-to-r from-primary to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={questions.length === 0 || !canContinue}
                    >
                      {isLastStep ? t(locale, "selfSurveyFinish") : t(locale, "selfSurveyNext")}
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {!loading && survey && finished ? (
              <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t(locale, "selfSurveyCompletedBadge")}
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">{t(locale, "selfSurveyThanks")}</h2>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-800 ring-1 ring-slate-200">
                  <p className="text-lg font-semibold text-slate-900">
                    {t(locale, "selfSurveyAverage")}: {displayAverage.toFixed(1)} / 10
                  </p>
                  <p className="text-slate-700">{summaryText}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {t(locale, "selfSurveyNote")}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={closeSurvey}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    {t(locale, "selfSurveyBack")}
                  </button>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new Event("stresssense-ai-open"));
                      closeSurvey();
                    }}
                    className="rounded-full bg-gradient-to-r from-primary to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105"
                  >
                    {t(locale, "selfSurveyAiTips")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </SurveyContext.Provider>
  );
}
