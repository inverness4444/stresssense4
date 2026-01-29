"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
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

export type SurveyTimeseriesPoint = { label: string; value: number | null };
// Optional date helps period filters; label parse is fallback if date is missing.
// date can be a Date, timestamp, or ISO-ish string.
export type SurveyTimeseriesPointWithDate = SurveyTimeseriesPoint & { date?: string | number | Date };

type DateRange = { from: string; to: string };
type BucketGranularity = "day" | "week" | "month";

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
  showCta?: boolean;
  onCtaClick?: (range: DateRange) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  syncRangeToUrl?: boolean;
  locale?: Locale;
};

const STRESS_COLORS = {
  low: "#22c55e",
  mid: "#f59e0b",
  high: "#ef4444",
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function interpolateColor(startHex: string, endHex: string, t: number) {
  const normalize = (hex: string) => {
    const value = hex.replace("#", "");
    const num = parseInt(value, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };
  const start = normalize(startHex);
  const end = normalize(endHex);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(mix(start.r, end.r))}${toHex(mix(start.g, end.g))}${toHex(mix(start.b, end.b))}`;
}

function getStressArcColor(progress: number) {
  const value = clamp01(progress);
  if (value <= 0.5) {
    return interpolateColor(STRESS_COLORS.low, STRESS_COLORS.mid, value / 0.5);
  }
  return interpolateColor(STRESS_COLORS.mid, STRESS_COLORS.high, (value - 0.5) / 0.5);
}

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

function parseDateValue(value?: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function normalizeRangeInput(from?: string | null, to?: string | null): DateRange | null {
  const fromDate = parseDateValue(from);
  const toDate = parseDateValue(to);
  if (!fromDate || !toDate) return null;
  const start = startOfDay(fromDate);
  const end = startOfDay(toDate);
  if (start > end) {
    return { from: formatDateValue(end), to: formatDateValue(start) };
  }
  return { from: formatDateValue(start), to: formatDateValue(end) };
}

function getRangeGranularity(start: Date, end: Date): BucketGranularity {
  const days = Math.max(1, differenceInCalendarDays(endOfDay(end), startOfDay(start)) + 1);
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
}

function formatRangeLabel(range: DateRange, locale: Locale = "en") {
  const start = parseDateValue(range.from);
  const end = parseDateValue(range.to);
  if (!start || !end) return locale === "ru" ? "Выберите период" : "Select a period";
  const formatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
  return `${formatter.format(start)} — ${formatter.format(end)}`;
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
  showCta = true,
  onCtaClick,
  dateRange,
  onDateRangeChange,
  syncRangeToUrl = true,
  locale = "en",
}: SurveyReportProps) {
  const searchParams = useSearchParams();
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisStart, setAnalysisStart] = useState<string>("");
  const [analysisEnd, setAnalysisEnd] = useState<string>("");
  const [aiReport, setAiReport] = useState<{ title: string; summary: string; bullets: string[] } | null>(null);
  const [lastAnalysisAt, setLastAnalysisAt] = useState<Date | null>(null);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    setChartReady(true);
  }, []);

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

  const queryFrom = searchParams?.get("from");
  const queryTo = searchParams?.get("to");
  const [queryRange, setQueryRange] = useState<DateRange | null>(() => normalizeRangeInput(queryFrom, queryTo));

  useEffect(() => {
    const next = normalizeRangeInput(queryFrom, queryTo);
    if (!next) return;
    setQueryRange((prev) => (prev?.from === next.from && prev?.to === next.to ? prev : next));
  }, [queryFrom, queryTo]);

  const derivedRange = useMemo<DateRange>(() => {
    if (queryRange) return queryRange;
    const propRange = normalizeRangeInput(dateRange?.from, dateRange?.to);
    if (propRange) return propRange;
    const first = sortedSeries.find((p) => typeof p.dateValue === "number");
    const last = [...sortedSeries].reverse().find((p) => typeof p.dateValue === "number");
    if (first?.dateValue && last?.dateValue) {
      return {
        from: formatDateValue(new Date(first.dateValue)),
        to: formatDateValue(new Date(last.dateValue)),
      };
    }
    const end = new Date();
    const start = addDays(end, -30);
    return { from: formatDateValue(start), to: formatDateValue(end) };
  }, [queryRange, dateRange?.from, dateRange?.to, sortedSeries]);

  const [range, setRange] = useState<DateRange>(derivedRange);
  const [draftRange, setDraftRange] = useState<DateRange>(derivedRange);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [activePoint, setActivePoint] = useState<{ label: string; value: number | null; dateValue: number; rangeEnd?: number } | null>(null);

  useEffect(() => {
    setRange((prev) => (prev.from === derivedRange.from && prev.to === derivedRange.to ? prev : derivedRange));
  }, [derivedRange]);

  useEffect(() => {
    setDraftRange(range);
    setAnalysisStart(range.from);
    setAnalysisEnd(range.to);
  }, [range.from, range.to]);

  useEffect(() => {
    if (!onDateRangeChange) return;
    onDateRangeChange(range);
  }, [onDateRangeChange, range]);

  useEffect(() => {
    if (!syncRangeToUrl || typeof window === "undefined") return;
    const next = new URLSearchParams(window.location.search);
    const currentFrom = next.get("from");
    const currentTo = next.get("to");
    if (currentFrom === range.from && currentTo === range.to) return;
    if (range.from) {
      next.set("from", range.from);
    } else {
      next.delete("from");
    }
    if (range.to) {
      next.set("to", range.to);
    } else {
      next.delete("to");
    }
    const query = next.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
    setQueryRange((prev) =>
      prev?.from === range.from && prev?.to === range.to ? prev : { from: range.from, to: range.to }
    );
  }, [syncRangeToUrl, range.from, range.to]);

  useEffect(() => {
    if (!rangePickerOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!pickerRef.current || !(event.target instanceof Node)) return;
      if (!pickerRef.current.contains(event.target)) {
        setRangePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [rangePickerOpen]);

  const normalizedRange = useMemo(() => normalizeRangeInput(range.from, range.to), [range.from, range.to]);

  const bucketedSeries = useMemo(() => {
    const rangeInput = normalizedRange;
    if (!rangeInput) return [];
    const rangeStart = startOfDay(parseISO(rangeInput.from));
    const rangeEnd = endOfDay(parseISO(rangeInput.to));

    const points = sortedSeries.filter((p) => typeof p.dateValue === "number");
    const inRange = points.filter((p) => {
      const value = p.dateValue ?? 0;
      return value >= rangeStart.getTime() && value <= rangeEnd.getTime();
    });
    const effective = inRange;

    const granularity = getRangeGranularity(rangeStart, rangeEnd);
    const buckets = new Map<string, { start: Date; sum: number; count: number }>();

    const bucketKeyForDate = (date: Date) => {
      if (granularity === "month") return startOfMonth(date).toISOString().slice(0, 7);
      if (granularity === "week") return startOfWeek(date, { weekStartsOn: 1 }).toISOString().slice(0, 10);
      return startOfDay(date).toISOString().slice(0, 10);
    };

    const bucketStartForDate = (date: Date) => {
      if (granularity === "month") return startOfMonth(date);
      if (granularity === "week") return startOfWeek(date, { weekStartsOn: 1 });
      return startOfDay(date);
    };

    effective.forEach((point) => {
      const date = new Date(point.dateValue as number);
      const key = bucketKeyForDate(date);
      const start = bucketStartForDate(date);
      const entry = buckets.get(key) ?? { start, sum: 0, count: 0 };
      entry.sum += Number(point.value ?? 0);
      entry.count += 1;
      buckets.set(key, entry);
    });

    const series: { label: string; value: number | null; dateValue: number; rangeEnd?: number }[] = [];
    const localeCode = locale === "ru" ? "ru-RU" : "en-US";
    const labelOptions =
      granularity === "month"
        ? ({ month: "short" } as const)
        : ({ month: "short", day: "numeric" } as const);

    if (granularity === "month") {
      let cursor = startOfMonth(rangeStart);
      const end = startOfMonth(rangeEnd);
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 7);
        const bucket = buckets.get(key);
        series.push({
          label: cursor.toLocaleDateString(localeCode, labelOptions),
          value: bucket ? Number((bucket.sum / bucket.count).toFixed(2)) : null,
          dateValue: cursor.getTime(),
          rangeEnd: endOfMonth(cursor).getTime(),
        });
        cursor = addMonths(cursor, 1);
      }
      return series;
    }

    if (granularity === "week") {
      let cursor = startOfWeek(rangeStart, { weekStartsOn: 1 });
      const end = startOfWeek(rangeEnd, { weekStartsOn: 1 });
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        const bucket = buckets.get(key);
        series.push({
          label: cursor.toLocaleDateString(localeCode, labelOptions),
          value: bucket ? Number((bucket.sum / bucket.count).toFixed(2)) : null,
          dateValue: cursor.getTime(),
          rangeEnd: endOfWeek(cursor, { weekStartsOn: 1 }).getTime(),
        });
        cursor = addWeeks(cursor, 1);
      }
      return series;
    }

    let cursor = startOfDay(rangeStart);
    const end = startOfDay(rangeEnd);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      series.push({
        label: cursor.toLocaleDateString(localeCode, labelOptions),
        value: bucket ? Number((bucket.sum / bucket.count).toFixed(2)) : null,
        dateValue: cursor.getTime(),
        rangeEnd: cursor.getTime(),
      });
      cursor = addDays(cursor, 1);
    }
    return series;
  }, [sortedSeries, locale, normalizedRange]);

  const rangeLabelText = normalizedRange ? formatRangeLabel(normalizedRange, locale) : periodLabel;

  const presets = useMemo(() => {
    const end = startOfDay(new Date());
    const to = formatDateValue(end);
    const makeRange = (start: Date) => ({ from: formatDateValue(start), to });
    return [
      {
        key: "7d",
        label: locale === "ru" ? "Последние 7 дней" : "Last 7 days",
        range: makeRange(addDays(end, -6)),
      },
      {
        key: "30d",
        label: locale === "ru" ? "30 дней" : "30 days",
        range: makeRange(addDays(end, -29)),
      },
      {
        key: "3m",
        label: locale === "ru" ? "3 месяца" : "3 months",
        range: makeRange(addMonths(end, -3)),
      },
      {
        key: "6m",
        label: locale === "ru" ? "6 месяцев" : "6 months",
        range: makeRange(addMonths(end, -6)),
      },
      {
        key: "1y",
        label: locale === "ru" ? "Год" : "Year",
        range: makeRange(addMonths(end, -12)),
      },
    ];
  }, [locale]);

  const applyRange = (nextRange: DateRange, options?: { close?: boolean }) => {
    setRange(nextRange);
    if (options?.close !== false) {
      setRangePickerOpen(false);
    }
    setActivePoint(null);
  };

  const applyDraftRange = () => {
    const normalized = normalizeRangeInput(draftRange.from, draftRange.to);
    if (!normalized) return;
    applyRange(normalized, { close: true });
  };

  const handleDraftChange = (nextRange: DateRange) => {
    setDraftRange(nextRange);
    const normalized = normalizeRangeInput(nextRange.from, nextRange.to);
    if (!normalized) return;
    applyRange(normalized, { close: false });
  };

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
    const values = series.map((p) => p.value).filter((v): v is number => typeof v === "number");
    const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    const deltaVal = values.length > 1 ? values[values.length - 1] - values[0] : 0;
    const deltaLabel = `${deltaVal >= 0 ? "+" : ""}${deltaVal.toFixed(2)}`;

    const rangeLabel = formatRangeLabel({ from: analysisStart, to: analysisEnd }, locale);
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

  const displayScore = score;
  const displayDelta = delta;
  const displayDeltaDirection = deltaDirection;

  const donut = useMemo(() => {
    const radius = 64;
    const strokeWidth = 14;
    const progressRaw = clamp01(displayScore / 10);
    const progress = progressRaw === 1 ? 0.9999 : progressRaw;
    const center = 90;
    const polarToCartesian = (angleDeg: number) => {
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      return {
        x: center + radius * Math.cos(rad),
        y: center + radius * Math.sin(rad),
      };
    };
    const start = polarToCartesian(0);
    const end = polarToCartesian(progress * 360);
    const largeArc = progress > 0.5 ? 1 : 0;
    const arc = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    return {
      radius,
      strokeWidth,
      progress: progressRaw,
      arc,
      gradient: { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
      endColor: getStressArcColor(progressRaw),
      showMid: progressRaw > 0.5,
    };
  }, [displayScore]);

  const deltaInfo = formatDelta(displayDelta, displayDeltaDirection, locale);
  const status = statusLabel(displayScore, locale);
  const periodLabelText = rangeLabelText;

  const chartSeries = useMemo(() => {
    return bucketedSeries.map((point) => {
      if (point.value === null || typeof point.value !== "number") {
        return { ...point, value: 0 };
      }
      const adjusted = Math.min(10, Math.max(0, point.value));
      return { ...point, value: Number(adjusted.toFixed(2)) };
    });
  }, [bucketedSeries]);

  const numericValues = bucketedSeries
    .map((t) => t.value)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const hasMissingBuckets = bucketedSeries.some((point) => point.value === null);
  const roundToTenth = (value: number) => Math.round(value * 10) / 10;
  const yMinRaw = numericValues.length > 0 ? Math.min(...numericValues) - 0.4 : 0;
  const yMaxRaw = numericValues.length > 0 ? Math.max(...numericValues) + 0.4 : 10;
  const yMin = hasMissingBuckets ? 0 : roundToTenth(Math.max(0, yMinRaw));
  const yMax = roundToTenth(Math.max(yMin + 0.6, yMaxRaw));
  const yRange = yMax - yMin;
  const yStep = yRange > 0 ? yRange / 3 : 1;
  const yTicks = Array.from({ length: 4 }, (_, idx) => roundToTenth(yMin + idx * yStep));
  const pointFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" }),
    [locale]
  );
  const formatPointRange = (point: { dateValue: number; rangeEnd?: number }) => {
    const start = new Date(point.dateValue);
    const end = point.rangeEnd ? new Date(point.rangeEnd) : start;
    if (point.rangeEnd && end.getTime() !== start.getTime()) {
      return `${pointFormatter.format(start)} — ${pointFormatter.format(end)}`;
    }
    return pointFormatter.format(start);
  };
  const handleChartClick = (event: any) => {
    const payload = event?.activePayload?.[0]?.payload;
    if (payload) setActivePoint(payload);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="relative flex flex-col items-end gap-2" ref={pickerRef}>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setRangePickerOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-primary/40"
            >
              <svg aria-hidden="true" className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="4.5" width="18" height="16" rx="3" />
                <path d="M8 3v4M16 3v4M3 9h18" />
              </svg>
              <span>{locale === "ru" ? "Календарь" : "Calendar"}</span>
            </button>
            <span className="text-xs font-semibold text-slate-600">{rangeLabelText}</span>
          </div>
          {rangePickerOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {locale === "ru" ? "Начало" : "Start"}
                  <input
                    type="date"
                    value={draftRange.from}
                    onChange={(e) => handleDraftChange({ ...draftRange, from: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {locale === "ru" ? "Конец" : "End"}
                  <input
                    type="date"
                    value={draftRange.to}
                    onChange={(e) => handleDraftChange({ ...draftRange, to: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyRange(preset.range)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary/30 hover:text-slate-800"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRangePickerOpen(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {locale === "ru" ? "Закрыть" : "Close"}
                </button>
                <button
                  type="button"
                  onClick={applyDraftRange}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-strong"
                >
                  {locale === "ru" ? "Применить" : "Apply"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showCta && (
        <div className="px-6 pt-3 sm:hidden">
          <button
            onClick={() => {
              if (onCtaClick) {
                const applied = normalizedRange ?? range;
                onCtaClick(applied);
                return;
              }
              setAnalysisOpen(true);
            }}
            className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-strong"
            type="button"
          >
            {ctaLabel}
          </button>
        </div>
      )}

      <div className="grid gap-6 px-6 pb-10 lg:grid-cols-[280px,1fr] lg:items-center">
        <div className="relative flex flex-col items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-inner">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg className="h-40 w-40" viewBox="0 0 180 180">
              <defs>
                <linearGradient
                  id="donutGradient"
                  x1={donut.gradient.x1}
                  y1={donut.gradient.y1}
                  x2={donut.gradient.x2}
                  y2={donut.gradient.y2}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor={STRESS_COLORS.low} />
                  {donut.showMid && <stop offset="55%" stopColor={STRESS_COLORS.mid} />}
                  <stop offset="100%" stopColor={donut.endColor} />
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
              {donut.progress > 0 && (
                <path
                  d={donut.arc}
                  stroke="url(#donutGradient)"
                  strokeWidth={donut.strokeWidth}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-700 ease-out"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold text-slate-900">{displayScore.toFixed(1)}</span>
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
          {chartReady ? (
            <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
              <AreaChart data={chartSeries} onClick={handleChartClick}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[yMin, yMax]}
                  ticks={yTicks}
                  tickFormatter={(value) => (Number.isFinite(value) ? Number(value).toFixed(1) : "")}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const point = payload[0]?.payload as { dateValue: number; value?: number | null; rangeEnd?: number };
                    if (!point || typeof point.dateValue !== "number") return null;
                    const value =
                      typeof point.value === "number" && Number.isFinite(point.value)
                        ? point.value.toFixed(1)
                        : locale === "ru"
                          ? "Нет данных"
                          : "No data";
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">
                        <p className="font-semibold text-slate-900">{formatPointRange(point)}</p>
                        <p>{value}</p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#colorScore)"
                  dot={{ r: 3 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] w-full" />
          )}
          {activePoint && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
              <span>{formatPointRange(activePoint)}</span>
              <span className="text-sm font-semibold text-slate-900">
                {typeof activePoint.value === "number" && Number.isFinite(activePoint.value)
                  ? activePoint.value.toFixed(1)
                  : locale === "ru"
                    ? "Нет данных"
                    : "No data"}
              </span>
            </div>
          )}
          {numericValues.length === 0 && (
            <div className="mt-2 text-xs text-slate-500">
              {locale === "ru" ? "Нет данных за выбранный период." : "No data for the selected period."}
            </div>
          )}
        </div>
      </div>

      {showCta && (
        <div className="absolute bottom-4 right-4 hidden flex-col items-end gap-1 sm:flex">
          <button
            onClick={() => {
              if (onCtaClick) {
                const applied = normalizedRange ?? range;
                onCtaClick(applied);
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
      )}

      {analysisOpen && !onCtaClick && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {locale === "ru" ? "AI-анализ вовлечённости" : "AI engagement analysis"}
                </p>
                <p className="text-sm text-slate-600">{formatRangeLabel({ from: analysisStart, to: analysisEnd }, locale)}</p>
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
                    setAnalysisStart(range.from);
                    setAnalysisEnd(range.to);
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
