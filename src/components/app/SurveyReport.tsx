"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import clsx from "clsx";

type TrendDirection = "up" | "down" | "flat";

export type SurveyDriver = {
  name: string;
  score: number;
  delta?: number;
};

export type SurveyTimeseriesPoint = { label: string; value: number };
// Optional date helps period filters; label parse is fallback if date is missing.
// date can be a Date, timestamp, or ISO-ish string.
export type SurveyTimeseriesPointWithDate = SurveyTimeseriesPoint & { date?: string | number | Date };

export type SurveyReportProps = {
  title?: string;
  subtitle?: string;
  score: number;
  delta?: number;
  deltaDirection?: TrendDirection;
  periodLabel?: string;
  timeseries: SurveyTimeseriesPointWithDate[];
  drivers?: SurveyDriver[];
  ctaLabel?: string;
  onCtaClick?: () => void;
  locale?: Locale;
};

function formatDelta(delta?: number, dir?: TrendDirection, locale: Locale = "en") {
  if (delta === undefined || dir === undefined) return { text: "--", color: "text-slate-500" };
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const color = dir === "up" ? "text-emerald-600" : dir === "down" ? "text-amber-600" : "text-slate-500";
  const suffix = locale === "ru" ? "пт" : "pt";
  return { text: `${arrow} ${Math.abs(delta).toFixed(1)} ${suffix}`, color };
}

function statusLabel(score: number, locale: Locale = "en") {
  if (score > 7.5) return { text: locale === "ru" ? "Здорово" : "Healthy", color: "text-emerald-700" };
  if (score >= 6) return { text: locale === "ru" ? "Зона внимания" : "Watch zone", color: "text-amber-600" };
  return { text: locale === "ru" ? "Требует внимания" : "Needs attention", color: "text-rose-600" };
}

export function SurveyReport({
  title = "Survey report",
  subtitle = "Live preview",
  score,
  delta = 0,
  deltaDirection = "flat",
  periodLabel = "Last 6 weeks",
  timeseries,
  drivers = [],
  ctaLabel = "Analyze engagement",
  onCtaClick,
  locale = "en",
}: SurveyReportProps) {
  type PeriodKey = "7d" | "30d" | "3m" | "6m";
  const [period, setPeriod] = useState<PeriodKey>("6m");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisStart, setAnalysisStart] = useState<string>("");
  const [analysisEnd, setAnalysisEnd] = useState<string>("");
  const [aiReport, setAiReport] = useState<{ title: string; summary: string; bullets: string[] } | null>(null);
  const [lastAnalysisAt, setLastAnalysisAt] = useState<Date | null>(null);

  const periodOptions: { label: string; key: PeriodKey }[] = useMemo(
    () => [
      { label: locale === "ru" ? "7 дней" : "7 days", key: "7d" },
      { label: locale === "ru" ? "30 дней" : "30 days", key: "30d" },
      { label: locale === "ru" ? "3 месяца" : "3 months", key: "3m" },
      { label: locale === "ru" ? "6 месяцев" : "6 months", key: "6m" },
    ],
    [locale]
  );

  const periodMeta: Record<PeriodKey, { days: number; fallbackCount: number; label: string }> = useMemo(
    () => ({
      "7d": { days: 7, fallbackCount: 7, label: locale === "ru" ? "Текущая неделя" : "Current week" },
      "30d": { days: 30, fallbackCount: 14, label: locale === "ru" ? "Текущие 30 дней" : "Current 30 days" },
      "3m": { days: 90, fallbackCount: 24, label: locale === "ru" ? "Последние 3 месяца" : "Last 3 months" },
      "6m": { days: 180, fallbackCount: 36, label: locale === "ru" ? "Последние 6 месяцев" : "Last 6 months" },
    }),
    [locale]
  );

  const normalizedSeries = useMemo(() => {
    const total = timeseries.length;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return (timeseries as SurveyTimeseriesPointWithDate[]).map((t, idx) => {
      const value = Number((t.value ?? 0).toFixed(1));
      let dateValue: number | undefined;
      if (t.date !== undefined) {
        const d = new Date(t.date);
        if (!Number.isNaN(d.getTime())) dateValue = d.getTime();
      } else {
        const parsed = Date.parse(t.label);
        if (!Number.isNaN(parsed)) dateValue = parsed;
      }
      if (dateValue === undefined) {
        // Fallback: spread points weekly to enable period filtering even without explicit dates.
        dateValue = Date.now() - (total - idx - 1) * weekMs;
      }
      return { ...t, value, _idx: idx, dateValue };
    });
  }, [timeseries]);

  const sortedSeries = useMemo(() => {
    const withDate = normalizedSeries.some((p) => p.dateValue !== undefined);
    const sorted = [...normalizedSeries].sort((a, b) => {
      if (withDate) {
        const aDate = a.dateValue ?? 0;
        const bDate = b.dateValue ?? 0;
        if (aDate === bDate) return (a._idx ?? 0) - (b._idx ?? 0);
        return aDate - bDate;
      }
      return (a._idx ?? 0) - (b._idx ?? 0);
    });
    return sorted;
  }, [normalizedSeries]);

  const visibleSeries = useMemo(() => {
    const cfg = periodMeta[period];
    if (sortedSeries.length === 0) return sortedSeries;

    const now = new Date();
    const startOfWeek = () => {
      const d = new Date(now);
      const day = d.getDay(); // Sunday = 0
      const diff = day === 0 ? -6 : 1 - day; // shift to Monday
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    let rangeStart = new Date(now);
    let rangeEnd = new Date(now);

    if (period === "7d") {
      rangeStart = startOfWeek();
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    } else if (period === "30d") {
      rangeStart.setHours(0, 0, 0, 0);
      rangeStart.setDate(rangeStart.getDate() - 29); // inclusive 30 days ending today
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      // for 3m/6m we align to the beginning of the first month in the window
      const months = period === "3m" ? 3 : 6;
      rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();

    const fmtLabel = (ms: number) =>
      new Date(ms).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
        month: "short",
        day: "numeric",
      });

    const dated = sortedSeries.filter((p) => typeof p.dateValue === "number");

    // Monthly aggregation for 3m/6m: one point per month, average of that month; carry last value if no data.
    if (period === "3m" || period === "6m") {
      const months = period === "3m" ? 3 : 6;
      const buckets: typeof sortedSeries = [];
      const beforeStart = dated
        .filter((p) => (p.dateValue ?? 0) <= startMs)
        .sort((a, b) => (b.dateValue ?? 0) - (a.dateValue ?? 0))[0];
      let lastValue = beforeStart?.value ?? sortedSeries[0].value ?? 0;

      for (let i = 0; i < months; i++) {
        const monthStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1);
        const nextMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i + 1, 1);
        const pts = dated.filter(
          (p) => (p.dateValue ?? 0) >= monthStart.getTime() && (p.dateValue ?? 0) < nextMonth.getTime()
        );
        if (pts.length > 0) {
          const avg = pts.reduce((acc, p) => acc + p.value, 0) / pts.length;
          lastValue = Number(avg.toFixed(2));
        }
        buckets.push({
          label: monthStart.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "short" }),
          value: lastValue,
          dateValue: monthStart.getTime(),
          _idx: i,
        });
      }

      return buckets;
    }

    // Daily buckets for 7d/30d
    const stepDays = 1;
    const stepMs = stepDays * 24 * 60 * 60 * 1000;

    const beforeStart = dated
      .filter((p) => (p.dateValue ?? 0) <= startMs)
      .sort((a, b) => (b.dateValue ?? 0) - (a.dateValue ?? 0))[0];
    let lastValue = beforeStart?.value ?? sortedSeries[0].value ?? 0;

    const pointsInRange = dated.filter((p) => (p.dateValue ?? 0) >= startMs && (p.dateValue ?? 0) <= endMs);
    let idx = 0;

    const buckets: typeof sortedSeries = [];
    for (let t = startMs; t <= endMs + 1; t += stepMs) {
      const bucketEnd = Math.min(t + stepMs, endMs + 1);
      while (idx < pointsInRange.length && (pointsInRange[idx].dateValue ?? 0) < bucketEnd) {
        lastValue = pointsInRange[idx].value;
        idx += 1;
      }
      buckets.push({
        label: fmtLabel(t),
        value: lastValue,
        dateValue: t,
        _idx: buckets.length,
      });
    }

    // Ensure actual points inside window are included exactly on their dates (not just bucket start).
    pointsInRange.forEach((p) => {
      buckets.push({
        ...p,
        label: fmtLabel(p.dateValue ?? startMs),
      });
    });

    const deduped = buckets
      .sort((a, b) => (a.dateValue ?? 0) - (b.dateValue ?? 0) || (a._idx ?? 0) - (b._idx ?? 0))
      .filter((p, i, arr) => i === 0 || (p.dateValue ?? 0) !== (arr[i - 1].dateValue ?? 0));

    return deduped;
  }, [period, periodMeta, sortedSeries, locale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("stresssense:lastEngagementAnalysis");
    if (stored) {
      const parsed = new Date(stored);
      if (!Number.isNaN(parsed.getTime())) {
        setLastAnalysisAt(parsed);
      }
    }
  }, []);

  useEffect(() => {
    const firstDate = sortedSeries[0]?.dateValue;
    const lastDate = sortedSeries[sortedSeries.length - 1]?.dateValue;
    if (firstDate) {
      const d = new Date(firstDate);
      setAnalysisStart(d.toISOString().slice(0, 10));
    }
    if (lastDate) {
      const d = new Date(lastDate);
      setAnalysisEnd(d.toISOString().slice(0, 10));
    }
  }, [sortedSeries]);

  const formatRangeLabel = (from?: string, to?: string) => {
    if (!from || !to) return locale === "ru" ? "Выберите период" : "Select a period";
    const fromLabel = new Date(from).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", year: "numeric" });
    const toLabel = new Date(to).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", year: "numeric" });
    return `${fromLabel} — ${toLabel}`;
  };

  const buildAiReport = () => {
    const from = analysisStart ? new Date(analysisStart) : null;
    const to = analysisEnd ? new Date(analysisEnd) : null;
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setAiReport({
        title: locale === "ru" ? "Укажите корректный период" : "Please set a valid period",
        summary: locale === "ru" ? "Нужны корректные даты начала и конца периода." : "Provide valid start and end dates.",
        bullets: [],
      });
      return;
    }

    const rangeStartMs = from.getTime();
    const rangeEndMs = to.getTime() + 24 * 60 * 60 * 1000; // inclusive end

    const inRange = sortedSeries.filter((p) => (p.dateValue ?? 0) >= rangeStartMs && (p.dateValue ?? 0) <= rangeEndMs);
    const series = inRange.length > 0 ? inRange : sortedSeries;
    const values = series.map((p) => p.value);
    const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    const deltaVal = values.length > 1 ? values[values.length - 1] - values[0] : 0;
    const deltaLabel = `${deltaVal >= 0 ? "+" : ""}${deltaVal.toFixed(2)}`;

    const rangeLabel = formatRangeLabel(analysisStart, analysisEnd);
    const summary =
      locale === "ru"
        ? `AI-отчёт за период ${rangeLabel}. Средний уровень вовлечённости: ${avg.toFixed(2)}/10. Изменение за период: ${deltaLabel}.`
        : `AI report for ${rangeLabel}. Average engagement: ${avg.toFixed(2)}/10. Change over period: ${deltaLabel}.`;

    const topUp =
      drivers
        .filter((d) => (d.delta ?? 0) > 0)
        .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
        .slice(0, 2)
        .map((d) => `${d.name}: +${(d.delta ?? 0).toFixed(1)}`) || [];
    const topDown =
      drivers
        .filter((d) => (d.delta ?? 0) < 0)
        .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
        .slice(0, 2)
        .map((d) => `${d.name}: ${(d.delta ?? 0).toFixed(1)}`) || [];

    const bullets =
      locale === "ru"
        ? [
            deltaVal >= 0 ? "Динамика стабильна или растёт, удерживайте ритм." : "Есть просадка — уточните приоритеты и нагрузку.",
            topUp.length > 0 ? `Рост: ${topUp.join(", ")}` : "Ростов по драйверам нет.",
            topDown.length > 0 ? `Снижение: ${topDown.join(", ")}` : "Просадок по драйверам нет.",
          ]
        : [
            deltaVal >= 0 ? "Trend is stable or up; keep cadence steady." : "Trend is down; revisit priorities and workload.",
            topUp.length > 0 ? `Upside: ${topUp.join(", ")}` : "No driver gains.",
            topDown.length > 0 ? `Risks: ${topDown.join(", ")}` : "No driver drops.",
          ];

    setAiReport({
      title: locale === "ru" ? "AI-отчёт готов" : "AI report ready",
      summary,
      bullets,
    });

    const now = new Date();
    setLastAnalysisAt(now);
    if (typeof window !== "undefined") {
      localStorage.setItem("stresssense:lastEngagementAnalysis", now.toISOString());
    }
  };

  const donut = useMemo(() => {
    const radius = 64;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(1, score / 10));
    const offset = circumference * (1 - progress);
    return { radius, strokeWidth, circumference, offset };
  }, [score]);

  const deltaInfo = formatDelta(delta, deltaDirection, locale);
  const status = statusLabel(score, locale);
  const periodLabelText = periodMeta[period]?.label ?? periodLabel;

  const yMin =
    visibleSeries.length > 0 ? Math.max(0, Math.min(...visibleSeries.map((t) => t.value)) - 0.5) : 0;
  const yMax =
    visibleSeries.length > 0 ? Math.max(...visibleSeries.map((t) => t.value)) + 0.5 : 10;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
          {periodOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPeriod(opt.key)}
              className={clsx(
                "rounded-full px-3 py-1 transition",
                period === opt.key ? "bg-white text-primary shadow-sm ring-1 ring-primary/30" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 px-6 pb-10 lg:grid-cols-[280px,1fr] lg:items-center">
        <div className="relative flex flex-col items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-inner">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg className="h-40 w-40 -rotate-90" viewBox="0 0 180 180">
              <defs>
                <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
              <circle
                cx="90"
                cy="90"
                r={donut.radius}
                stroke="#e5e7eb"
                strokeWidth={donut.strokeWidth}
                fill="none"
              />
              <circle
                cx="90"
                cy="90"
                r={donut.radius}
                stroke="url(#donutGradient)"
                strokeWidth={donut.strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${donut.circumference} ${donut.circumference}`}
                strokeDashoffset={donut.offset}
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold text-slate-900">{score.toFixed(1)}</span>
              <span className="text-xs font-semibold text-slate-500">/10</span>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <p className={clsx("font-semibold", status.color)}>{status.text}</p>
            <p className={clsx("flex items-center gap-2 text-xs font-semibold", deltaInfo.color)}>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {periodLabelText}
              </span>
              {deltaInfo.text}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 shadow-inner">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={visibleSeries}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorScore)"
                dot={{ r: 3 }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {drivers.length > 0 && (
        <div className="border-t border-slate-100 bg-white/80 px-6 pb-6 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Drivers</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drivers.map((driver) => {
              const driverDelta = driver.delta ?? 0;
              const driverDir: TrendDirection = driverDelta > 0 ? "up" : driverDelta < 0 ? "down" : "flat";
              const driverDeltaInfo = formatDelta(driverDelta, driverDir);
              return (
                <div
                  key={driver.name}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{driver.name}</p>
                    <span className="text-xs font-semibold text-slate-700">{driver.score.toFixed(1)}</span>
                  </div>
                  <p className={clsx("text-xs font-semibold", driverDeltaInfo.color)}>{driverDeltaInfo.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1">
        <button
          onClick={() => {
            if (onCtaClick) {
              onCtaClick();
              return;
            }
            setAnalysisOpen(true);
          }}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-strong"
          type="button"
        >
          {ctaLabel}
        </button>
      </div>

      {analysisOpen && !onCtaClick && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {locale === "ru" ? "AI-анализ вовлечённости" : "AI engagement analysis"}
                </p>
                <p className="text-sm text-slate-600">{formatRangeLabel(analysisStart, analysisEnd)}</p>
                {lastAnalysisAt && (
                  <p className="text-[11px] text-slate-500">
                    {locale === "ru"
                      ? `Последний анализ: ${lastAnalysisAt.toLocaleString("ru-RU")}`
                      : `Last analysis: ${lastAnalysisAt.toLocaleString("en-US")}`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAnalysisOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {locale === "ru" ? "Закрыть" : "Close"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                {locale === "ru" ? "Начало периода" : "Start date"}
                <input
                  type="date"
                  value={analysisStart}
                  onChange={(e) => setAnalysisStart(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                {locale === "ru" ? "Конец периода" : "End date"}
                <input
                  type="date"
                  value={analysisEnd}
                  onChange={(e) => setAnalysisEnd(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={buildAiReport}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong"
              >
                {locale === "ru" ? "Сгенерировать отчёт" : "Generate report"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const first = sortedSeries[0]?.dateValue;
                  const last = sortedSeries[sortedSeries.length - 1]?.dateValue;
                  if (first) setAnalysisStart(new Date(first).toISOString().slice(0, 10));
                  if (last) setAnalysisEnd(new Date(last).toISOString().slice(0, 10));
                  setAiReport(null);
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {locale === "ru" ? "Сбросить" : "Reset"}
              </button>
            </div>

            {aiReport && (
              <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{aiReport.title}</p>
                <p className="text-sm text-slate-700">{aiReport.summary}</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {aiReport.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
