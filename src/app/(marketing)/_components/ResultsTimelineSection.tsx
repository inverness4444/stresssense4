"use client";

import Link from "next/link";
import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

type Period = "week" | "month";

type IconName = "check" | "bolt" | "chart" | "shield";

type ResultItem = {
  id: string;
  icon: IconName;
  textKey: string;
};

const PERIOD_TABS: { id: Period; labelKey: string }[] = [
  { id: "week", labelKey: "landingResultsTabWeek" },
  { id: "month", labelKey: "landingResultsTabMonth" },
];

const TIMELINE_ITEMS: Record<Period, { employees: ResultItem[]; managers: ResultItem[] }> = {
  week: {
    employees: [
      { id: "week-emp-1", icon: "chart", textKey: "landingResultsWeekEmployees1" },
      { id: "week-emp-2", icon: "bolt", textKey: "landingResultsWeekEmployees2" },
      { id: "week-emp-3", icon: "shield", textKey: "landingResultsWeekEmployees3" },
      { id: "week-emp-4", icon: "check", textKey: "landingResultsWeekEmployees4" },
      { id: "week-emp-5", icon: "check", textKey: "landingResultsWeekEmployees5" },
    ],
    managers: [
      { id: "week-mgr-1", icon: "chart", textKey: "landingResultsWeekManagers1" },
      { id: "week-mgr-2", icon: "bolt", textKey: "landingResultsWeekManagers2" },
      { id: "week-mgr-3", icon: "check", textKey: "landingResultsWeekManagers3" },
      { id: "week-mgr-4", icon: "bolt", textKey: "landingResultsWeekManagers4" },
      { id: "week-mgr-5", icon: "chart", textKey: "landingResultsWeekManagers5" },
    ],
  },
  month: {
    employees: [
      { id: "month-emp-1", icon: "chart", textKey: "landingResultsMonthEmployees1" },
      { id: "month-emp-2", icon: "bolt", textKey: "landingResultsMonthEmployees2" },
      { id: "month-emp-3", icon: "check", textKey: "landingResultsMonthEmployees3" },
      { id: "month-emp-4", icon: "check", textKey: "landingResultsMonthEmployees4" },
      { id: "month-emp-5", icon: "chart", textKey: "landingResultsMonthEmployees5" },
    ],
    managers: [
      { id: "month-mgr-1", icon: "chart", textKey: "landingResultsMonthManagers1" },
      { id: "month-mgr-2", icon: "check", textKey: "landingResultsMonthManagers2" },
      { id: "month-mgr-3", icon: "shield", textKey: "landingResultsMonthManagers3" },
      { id: "month-mgr-4", icon: "check", textKey: "landingResultsMonthManagers4" },
      { id: "month-mgr-5", icon: "bolt", textKey: "landingResultsMonthManagers5" },
    ],
  },
};

function ResultIcon({ name }: { name: IconName }) {
  const className = "h-4 w-4";
  switch (name) {
    case "check":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 3 5-6" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" />
        </svg>
      );
    default:
      return null;
  }
}

function ResultsColumn({ title, items, locale }: { title: string; items: ResultItem[]; locale: Locale }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 text-sm text-slate-700 shadow-sm">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <ResultIcon name={item.icon} />
            </span>
            <span>{t(locale, item.textKey)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResultsTimelineSection({ locale }: { locale?: Locale }) {
  const [period, setPeriod] = useState<Period>("week");
  const current = TIMELINE_ITEMS[period];
  const resolvedLocale: Locale = locale ?? "en";

  return (
    <section id="results-timeline" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{t(resolvedLocale, "landingResultsEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{t(resolvedLocale, "landingResultsTitle")}</h2>
          <p className="mt-4 text-base text-slate-600">{t(resolvedLocale, "landingResultsSubtitle")}</p>
        </div>

        <div className="mt-8 flex justify-center">
          <div
            role="tablist"
            aria-label={t(resolvedLocale, "landingResultsPeriodLabel")}
            className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-600 shadow-inner ring-1 ring-slate-200"
          >
            {PERIOD_TABS.map((tab) => {
              const isActive = period === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setPeriod(tab.id)}
                  className={`rounded-full px-4 py-2 transition ${
                    isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t(resolvedLocale, tab.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <ResultsColumn title={t(resolvedLocale, "landingResultsEmployeesTitle")} items={current.employees} locale={resolvedLocale} />
          <ResultsColumn title={t(resolvedLocale, "landingResultsManagersTitle")} items={current.managers} locale={resolvedLocale} />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">{t(resolvedLocale, "landingResultsFootnote")}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
          >
            {t(resolvedLocale, "landingResultsCtaPrimary")}
          </Link>
          <a
            href="#demo"
            className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary"
          >
            {t(resolvedLocale, "landingResultsCtaSecondary")}
          </a>
        </div>
      </div>
    </section>
  );
}
