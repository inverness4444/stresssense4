"use client";

import { useSelfStressSurvey } from "@/components/app/SelfStressSurveyProvider";
import type { Locale } from "@/lib/i18n";

export function StressSurveyCTA({ locale }: { locale: Locale }) {
  const { openSurvey } = useSelfStressSurvey();
  const isRu = locale === "ru";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isRu ? "StressSense" : "StressSense"}
          </p>
          <h3 className="text-sm font-semibold text-slate-900">
            {isRu ? "Пройти стресс-опрос" : "Take a stress pulse"}
          </h3>
          <p className="text-sm text-slate-600">
            {isRu
              ? "Опрос только про рабочий стресс и нагрузку. Ответы локальные для демо."
              : "Pulse about work stress and workload. Local-only for demo."}
          </p>
        </div>
        <button
          onClick={openSurvey}
          className="rounded-full bg-gradient-to-r from-primary to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105"
        >
          {isRu ? "Пройти стресс-опрос" : "Start survey"}
        </button>
      </div>
    </div>
  );
}
