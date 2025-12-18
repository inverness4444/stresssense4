import { useEffect, useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { STRESS_QUESTION_DAYS, getTodayQuestionSetForUser, type StressQuestion } from "@/config/stressQuestionBank";

type StressLevel = "low" | "mid" | "high";

type Props = {
  locale: Locale;
  statusLabel: string;
  userId: string;
};

export function EmployeeAiCoachCard({ locale, statusLabel, userId }: Props) {
  const isRu = locale === "ru";
  const [stressScore, setStressScore] = useState<number | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, number>>({});
  const [activeDay, setActiveDay] = useState(() => getTodayQuestionSetForUser(userId, new Date(), STRESS_QUESTION_DAYS, [], locale));

  useEffect(() => {
    setActiveDay(getTodayQuestionSetForUser(userId, new Date(), STRESS_QUESTION_DAYS, [], locale));
    setQuestionAnswers({});
  }, [userId, locale]);

  const stressAdvice: Record<StressLevel, string[]> = {
    low: [
      t(locale, "coachAdviceLow1"),
      t(locale, "coachAdviceLow2"),
      t(locale, "coachAdviceLow3"),
    ],
    mid: [
      t(locale, "coachAdviceMid1"),
      t(locale, "coachAdviceMid2"),
      t(locale, "coachAdviceMid3"),
    ],
    high: [
      t(locale, "coachAdviceHigh1"),
      t(locale, "coachAdviceHigh2"),
      t(locale, "coachAdviceHigh3"),
      t(locale, "coachAdviceHigh4"),
    ],
  };

  const scaleType: "likert5" | "tenPoint" = "likert5";
  const answerScale = useMemo(() => {
    if (scaleType === "tenPoint") {
      return Array.from({ length: 11 }).map((_, idx) => ({ value: idx, label: String(idx) }));
    }
    return [
      { value: 0, label: t(locale, "likertStronglyDisagree") },
      { value: 1, label: t(locale, "likertDisagree") },
      { value: 2, label: t(locale, "likertNeutral") },
      { value: 3, label: t(locale, "likertAgree") },
      { value: 4, label: t(locale, "likertStronglyAgree") },
    ];
  }, [locale, scaleType]);

  const stressLevel: StressLevel = (() => {
    if (stressScore == null) return "mid";
    if (stressScore <= 3) return "low";
    if (stressScore >= 8) return "high";
    return "mid";
  })();

  const answeredCount = Object.keys(questionAnswers).length;
  const adviceList = stressAdvice[stressLevel];
  const dayIndex = STRESS_QUESTION_DAYS.findIndex((d) => d.id === activeDay.id);
  const safeDayIndex = dayIndex >= 0 ? dayIndex : 0;

  const handleStressSelect = (value: number) => {
    setStressScore(value);
    setQuestionAnswers({});
  };

  const handleAnswer = (qId: string, value: number) => {
    setQuestionAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const dimensionKey = (dimension: StressQuestion["dimension"]) => {
    switch (dimension) {
      case "load":
        return "dimensionLoad";
      case "clarity":
        return "dimensionClarity";
      case "manager_support":
        return "dimensionManagerSupport";
      case "meetings_focus":
        return "dimensionMeetingsFocus";
      case "safety":
        return "dimensionSafety";
      case "balance":
        return "dimensionBalance";
      case "control":
        return "dimensionControl";
      case "recognition":
        return "dimensionRecognition";
      case "processes":
        return "dimensionProcesses";
      case "long_term":
        return "dimensionLongTerm";
      default:
        return dimension;
    }
  };

  return (
    <div className="grid gap-4 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t(locale, "coachBadge")}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {t(locale, "coachStressScope")}
              </span>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {statusLabel}
          </span>
        </div>

        <div className="space-y-4 rounded-2xl bg-slate-50/60 p-4 ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t(locale, "coachStep1")}
              </p>
              <h3 className="text-base font-semibold text-slate-900">
                {t(locale, "coachRateStress")}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t(locale, "coachLowStress")}</span>
            <span>{t(locale, "coachHighStress")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 11 }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleStressSelect(idx)}
                className={`h-9 min-w-[36px] rounded-full px-3 text-sm font-semibold transition ${
                  stressScore === idx
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {idx}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-slate-50/60 p-4 ring-1 ring-slate-200/70">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t(locale, "coachStep2")}
            </p>
            <h3 className="text-base font-semibold text-slate-900">
              {t(locale, "coachAiQuestions")}
            </h3>
            <p className="text-sm text-slate-600">
              {t(locale, "coachTodayPulse")
                .replace("{{day}}", String(safeDayIndex + 1))
                .replace("{{total}}", String(STRESS_QUESTION_DAYS.length))}
            </p>
            <p className="text-sm text-slate-600">{activeDay.label}</p>
          </div>

          <div className="space-y-3">
            {activeDay.questions.map((q) => (
              <div key={q.id} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{q.text}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 capitalize">
                    {t(locale, dimensionKey(q.dimension))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {answerScale.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => handleAnswer(q.id, a.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        questionAnswers[q.id] === a.value
                          ? "bg-primary text-white shadow-sm shadow-primary/30"
                          : "bg-slate-50 text-slate-800 ring-1 ring-slate-200 hover:bg-white"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex h-full flex-col justify-between rounded-2xl bg-slate-50/80 p-4 shadow-inner ring-1 ring-slate-100">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t(locale, "coachAiResponse")}
          </p>
          <h4 className="text-sm font-semibold text-slate-900">
            {t(locale, "coachStressTips")}
          </h4>
          <p className="text-xs text-slate-500">
            {t(locale, "coachGathering").replace("{{label}}", activeDay.label)}
          </p>
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-800">
          {stressScore == null ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-600">
              {t(locale, "coachRatePrompt")}
            </div>
          ) : answeredCount === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-600">
              {t(locale, "coachAnswerPrompt")}
            </div>
          ) : (
            <>
              <p>
                {stressLevel === "high"
                  ? t(locale, "coachHighText")
                  : stressLevel === "mid"
                    ? t(locale, "coachMidText")
                    : t(locale, "coachLowText")}
              </p>
              <p className="text-xs text-slate-500">
                {t(locale, "coachThemeLabel").replace("{{label}}", activeDay.label)}
              </p>
              <ul className="space-y-1 text-slate-700">
                {adviceList.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
