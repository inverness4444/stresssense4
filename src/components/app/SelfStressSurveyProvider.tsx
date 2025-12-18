"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import clsx from "clsx";
import { STRESS_QUESTION_DAYS, getTodayQuestionSetForUser } from "@/config/stressQuestionBank";

type SurveyContextValue = {
  open: boolean;
  openSurvey: () => void;
  closeSurvey: () => void;
};

const SurveyContext = createContext<SurveyContextValue | null>(null);

type Props = { children: React.ReactNode; locale: Locale };

type StressLevel = "low" | "mid" | "high";

export function useSelfStressSurvey() {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error("SelfStressSurveyProvider missing");
  return ctx;
}

export function SelfStressSurveyProvider({ children, locale }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => []);
  const [finished, setFinished] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [lastCompletedDay, setLastCompletedDay] = useState<string | null>(null);
  const isLastStep = questions.length > 0 && step === questions.length - 1;

  const hydrateQuestions = () => {
    const today = new Date();
    setLastCompletedDay(window.localStorage.getItem("stressSurveyLastCompleted"));
    const questionSet = getTodayQuestionSetForUser("local-user", today, STRESS_QUESTION_DAYS, [], locale);
    const list = questionSet.questions.map((q) => q.text);
    setQuestions(list);
    setAnswers(Array(list.length || 1).fill(null));
  };

  useEffect(() => {
    hydrateQuestions();
  }, []);

  useEffect(() => {
    const handler = () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      if (lastCompletedDay === todayIso) {
        return;
      }
      if (questions.length === 0) {
        hydrateQuestions();
      }
      setOpen(true);
      setFinished(false);
      setStep(0);
      setAnswers(Array(questions.length || 1).fill(null));
    };
    window.addEventListener("open-self-stress-survey", handler);
    return () => window.removeEventListener("open-self-stress-survey", handler);
  }, [lastCompletedDay, questions.length]);

  const openSurvey = () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    if (lastCompletedDay === todayIso) return;
    if (questions.length === 0) {
      hydrateQuestions();
    }
    setOpen(true);
    setFinished(false);
    setStep(0);
    setAnswers(Array(questions.length || 1).fill(null));
  };
  const closeSurvey = () => {
    setOpen(false);
    setFinished(false);
    setStep(0);
  };

  const answeredCount = answers.filter((a) => a != null).length;
  const average = answers.filter((a) => a != null).reduce((sum, v) => sum + (v ?? 0), 0) / (answeredCount || 1);
  const level: StressLevel = average >= 7 ? "high" : average > 3 ? "mid" : "low";

  const summaryText =
    level === "high"
      ? t(locale, "selfSurveySummaryHigh")
      : level === "mid"
        ? t(locale, "selfSurveySummaryMid")
        : t(locale, "selfSurveySummaryLow");

  const handleCompleteSurvey = () => {
    // placeholder for future API call
    console.log("Stress survey answers", answers);
    const todayIso = new Date().toISOString().slice(0, 10);
    window.localStorage.setItem("stressSurveyLastCompleted", todayIso);
    setLastCompletedDay(todayIso);
    window.dispatchEvent(
      new CustomEvent("stress-survey-completed", {
        detail: { average, answers, date: new Date().toISOString() },
      })
    );
    setFinished(true);
  };

  const setAnswer = (val: number | null) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = val;
      return next;
    });
  };

  const onNext = () => {
    if (questions.length === 0) return;
    if (isLastStep) {
      handleCompleteSurvey();
      return;
    }
    setStep((s) => Math.min(s + 1, questions.length - 1));
  };
  const onPrev = () => setStep((s) => Math.max(0, s - 1));
  const progressLabel = questions.length ? `${step + 1}/${questions.length}` : "—";

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

            {!finished ? (
              <>
                <div className="text-center space-y-3 px-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {t(locale, "selfSurveyBadge")}
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-900">{questions[step]}</h2>
                  <p className="text-sm text-slate-600">
                    {t(locale, "selfSurveySafe")}
                  </p>
                </div>

                <div className="mt-6 flex flex-col items-center gap-3 px-4">
                  <div className="flex w-full max-w-2xl items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">
                      {t(locale, "selfSurveyScaleMin")}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={answers[step] ?? 5}
                      onChange={(e) => setAnswer(Number(e.target.value))}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary"
                    />
                    <span className="text-xs font-semibold text-slate-500">
                      {t(locale, "selfSurveyScaleMax")}
                    </span>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                    {t(locale, "selfSurveyCurrent")}: {answers[step] ?? "—"}/10
                  </div>
                </div>

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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onNext}
                        className="rounded-full bg-gradient-to-r from-primary to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={questions.length === 0}
                      >
                        {isLastStep ? t(locale, "selfSurveyFinish") : t(locale, "selfSurveyNext")}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t(locale, "selfSurveyCompletedBadge")}
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">{t(locale, "selfSurveyThanks")}</h2>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-800 ring-1 ring-slate-200">
                  <p className="text-lg font-semibold text-slate-900">
                    {t(locale, "selfSurveyAverage")}: {average.toFixed(1)} / 10
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
            )}
          </div>
        </div>
      )}
    </SurveyContext.Provider>
  );
}
