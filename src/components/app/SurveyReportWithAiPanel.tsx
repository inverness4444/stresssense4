"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SurveyReport, type SurveyReportProps, type SurveyTimeseriesPointWithDate } from "./SurveyReport";
import { AiEngagementReportPanel } from "./AiEngagementReportPanel";
import { createEmptyAiEngagementReport, type AiEngagementReport } from "@/lib/ai/engagementReport";
import { t } from "@/lib/i18n";
import type { AnalysisPayload, ReportContext } from "@/lib/ai/analysisTypes";

type Props = SurveyReportProps & {
  reportContext: ReportContext;
  aiEnabled?: boolean;
};

export function SurveyReportWithAiPanel({
  reportContext,
  aiEnabled = true,
  ...reportProps
}: Props) {
  const { scope, scopeId, dateRange } = reportContext;
  const [open, setOpen] = useState(false);
  const locale = reportProps.locale ?? "en";
  const focusAudience: "employee" | "manager" = scope === "user" ? "employee" : "manager";
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(dateRange);
  const [series, setSeries] = useState(reportProps.timeseries);
  const analysisCacheRef = useRef<Map<string, AnalysisPayload>>(new Map());
  const requestIdRef = useRef(0);
  const insightsError = t(locale, "aiInsightsError");
  const paymentError = t(locale, "aiDisabledNoSubscription");
  const trialDaysRequired = 7;
  const trialRequiresError = t(locale, "aiTrialRequiresDays").replace("{{count}}", String(trialDaysRequired));
  const trialUsedError = t(locale, "aiTrialAlreadyUsed");
  const buildRangeKey = (nextRange: { from: string; to: string }) =>
    `${scope}:${scopeId ?? ""}:${locale}:${nextRange.from}:${nextRange.to}`;

  const buildFallbackReport = (analysis: AnalysisPayload): AiEngagementReport => {
    const { meta, computed } = analysis;
    const dateFormatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
    const periodLabel = `${dateFormatter.format(new Date(meta.dateFrom))} — ${dateFormatter.format(new Date(meta.dateTo))}`;
    const stressMetric = computed.topCards.find((c) => c.key === "stress");
    const engagementMetric = computed.topCards.find((c) => c.key === "engagement");
    const avgStress = stressMetric?.avgScore ?? 0;
    const avgEngagement = engagementMetric?.avgScore ?? 0;
    const deltaStress = stressMetric?.delta ?? 0;
    const deltaEngagement = engagementMetric?.delta ?? 0;
    const trends =
      (stressMetric?.trendPoints?.length ? stressMetric.trendPoints : engagementMetric?.trendPoints ?? []) as any;
    const drivers = (computed.drivers ?? []).filter((d) => (d.sampleSize ?? 0) > 0);
    const positiveDriversByDelta = [...drivers]
      .filter((d) => typeof d.delta === "number" && d.delta > 0)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
      .slice(0, 3);
    const riskDriversByDelta = [...drivers]
      .filter((d) => typeof d.delta === "number" && d.delta < 0)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
      .slice(0, 3);
    const scoredDrivers = [...drivers].filter((d) => typeof d.avgScore === "number");
    const positiveDrivers = positiveDriversByDelta.length
      ? positiveDriversByDelta
      : scoredDrivers.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0)).slice(0, 3);
    const riskDrivers = riskDriversByDelta.length
      ? riskDriversByDelta
      : scoredDrivers.sort((a, b) => (a.avgScore ?? 0) - (b.avgScore ?? 0)).slice(0, 3);
    const driversSummary = locale === "ru"
      ? `Рост: ${positiveDrivers.map((d) => d.label).filter(Boolean).join(", ") || "нет выраженных"}; риски: ${riskDrivers.map((d) => d.label).filter(Boolean).join(", ") || "не выделяются"}.`
      : `Gains: ${positiveDrivers.map((d) => d.label).filter(Boolean).join(", ") || "no clear drivers"}; risks: ${riskDrivers.map((d) => d.label).filter(Boolean).join(", ") || "no clear risks"}.`;
    const managerFocus = riskDrivers.map((driver) => ({
      title: locale === "ru" ? `Улучшить: ${driver.label}` : `Improve: ${driver.label}`,
      tags: [driver.key],
      description:
        focusAudience === "employee"
          ? locale === "ru"
            ? `Сделайте личный шаг по теме "${driver.label}".`
            : `Take a personal step on "${driver.label}".`
          : locale === "ru"
            ? `Сфокусируйтесь на факторе "${driver.label}" и снимите ключевые блокеры.`
            : `Focus on "${driver.label}" and remove the main blockers.`,
    }));
    const nudges = riskDrivers.map((driver) => ({
      text:
        focusAudience === "employee"
          ? locale === "ru"
            ? `Попробуйте одно действие по теме "${driver.label}".`
            : `Try one personal action on "${driver.label}".`
          : locale === "ru"
            ? `Сделайте один управленческий шаг по теме "${driver.label}".`
            : `Take one managerial step on "${driver.label}".`,
      tags: [driver.key],
      steps:
        focusAudience === "employee"
          ? locale === "ru"
            ? ["Определите, что мешает", "Выберите 1 небольшой шаг", "Зафиксируйте результат"]
            : ["Identify the blocker", "Pick 1 small step", "Track the outcome"]
          : locale === "ru"
            ? ["Определите причину", "Согласуйте 1-2 улучшения"]
            : ["Identify the root cause", "Agree on 1-2 improvements"],
    }));

    return {
      period: { from: meta.dateFrom, to: meta.dateTo },
      isEmpty: false,
      summary:
        locale === "ru"
          ? `Период ${periodLabel}: вовлеченность ${avgEngagement.toFixed(1)}/10, стресс ${avgStress.toFixed(1)}/10.`
          : `Period ${periodLabel}: engagement ${avgEngagement.toFixed(1)}/10, stress ${avgStress.toFixed(1)}/10.`,
      snapshotNote: t(locale, "aiSampleSizeNote").replace("{{count}}", String(meta.sampleSizeTotal)),
      avgStress,
      avgEngagement,
      deltaStress,
      deltaEngagement,
      trends,
      trendInsight: "",
      driversPositive: positiveDrivers.map((driver) => ({
        name: driver.label,
        score: driver.avgScore,
        delta: driver.delta,
        sentiment: "positive" as const,
      })),
      driversRisk: riskDrivers.map((driver) => ({
        name: driver.label,
        score: driver.avgScore,
        delta: driver.delta,
        sentiment: "risk" as const,
      })),
      driversSummary,
      teamsFocus: [],
      participationRate: analysis.report?.participationRate ?? 0,
      participationNote: analysis.report?.participationNote ?? "",
      managerFocus,
      nudges,
      disclaimer: analysis.report?.disclaimer ?? t(locale, "aiDisclaimerText"),
    };
  };

  useEffect(() => {
    setRange(dateRange);
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    setSeries(reportProps.timeseries);
  }, [reportProps.timeseries]);

  useEffect(() => {
    let cancelled = false;
    const fetchSeries = async () => {
      if (!range?.from || !range?.to) return;
      try {
        const response = await fetch("/api/reports/timeseries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            scopeId,
            locale,
            from: range.from,
            to: range.to,
          }),
        });
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        const points = Array.isArray(payload?.points) ? payload.points : null;
        if (!cancelled && points) {
          setSeries(points.map((p: any) => ({ label: p.label, value: p.value, date: p.date })));
        }
      } catch {
        // Keep existing series on failure.
      }
    };
    fetchSeries();
    return () => {
      cancelled = true;
    };
  }, [scope, scopeId, locale, range.from, range.to]);

  const fallbackRange = useMemo(() => {
    if (range?.from && range?.to) return range;
    const seriesPoints = (series ?? []) as SurveyTimeseriesPointWithDate[];
    const lastPoint = [...seriesPoints].reverse().find((p) => p?.date || p?.label);
    let anchor = new Date();
    if (lastPoint?.date) {
      const d = new Date(lastPoint.date);
      if (!Number.isNaN(d.getTime())) anchor = d;
    } else if (lastPoint?.label) {
      const parsed = new Date(lastPoint.label);
      if (!Number.isNaN(parsed.getTime())) anchor = parsed;
    }
    const end = anchor;
    const start = new Date(anchor.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  }, [range, series]);

  const aiReport = useMemo(() => {
    if (analysis?.report) {
      if (analysis.report.isEmpty && analysis.meta?.sampleSizeTotal > 0) {
        return buildFallbackReport(analysis);
      }
      return analysis.report;
    }
    return createEmptyAiEngagementReport(fallbackRange, locale);
  }, [analysis, locale, fallbackRange]);

  const trendSeries = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
    const normalized = (series ?? [])
      .map((point, idx) => {
        const value = typeof point.value === "number" && Number.isFinite(point.value) ? Number(point.value.toFixed(2)) : null;
        if (value === null) return null;
        let label = point.label;
        if (!label && point.date) {
          const parsed = new Date(point.date);
          if (!Number.isNaN(parsed.getTime())) {
            label = formatter.format(parsed);
          }
        }
        if (!label) label = `#${idx + 1}`;
        return { label, value, date: point.date };
      })
      .filter(Boolean) as { label: string; value: number; date?: string | number | Date }[];

    if (normalized.length >= 2) return normalized;
    if (normalized.length === 0) return normalized;

    const safeRange = range?.from && range?.to ? range : fallbackRange;
    const fromDate = new Date(safeRange.from);
    const toDate = new Date(safeRange.to);
    const fromValid = !Number.isNaN(fromDate.getTime());
    const toValid = !Number.isNaN(toDate.getTime());
    const firstLabel = fromValid ? formatter.format(fromDate) : normalized[0].label;
    let secondDate = toValid ? toDate : fromValid ? new Date(fromDate.getTime() + 86400000) : undefined;
    if (secondDate && fromValid && secondDate.getTime() === fromDate.getTime()) {
      secondDate = new Date(fromDate.getTime() + 86400000);
    }
    const secondLabel = secondDate ? formatter.format(secondDate) : normalized[0].label;
    return [
      { ...normalized[0], label: firstLabel, date: fromValid ? fromDate.toISOString() : normalized[0].date },
      { label: secondLabel, value: normalized[0].value, date: secondDate ? secondDate.toISOString() : normalized[0].date },
    ];
  }, [series, locale, range?.from, range?.to, fallbackRange]);

  const reportForPanel = useMemo(() => {
    if (!aiReport) return aiReport;
    if (trendSeries.length === 0) return aiReport;
    return { ...aiReport, trends: trendSeries };
  }, [aiReport, trendSeries]);

  const handleAnalyze = async (nextRange: { from: string; to: string }) => {
    if (!aiEnabled) return;
    const rangeKey = buildRangeKey(nextRange);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setRange(nextRange);
    setOpen(true);
    setLoading(true);
    setError(null);
    const cached = analysisCacheRef.current.get(rangeKey);
    if (cached) {
      setAnalysis(cached);
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    try {
      controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
      const timeoutMs = process.env.NODE_ENV === "development" ? 30000 : 20000;
      timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          scopeId,
          locale,
          from: nextRange.from,
          to: nextRange.to,
        }),
        signal: controller?.signal,
      });
      const payload = await response.json().catch(() => null);
      if (requestId !== requestIdRef.current) return;
      if (!response.ok) {
        if (response.status === 402) {
          setError(paymentError);
          return;
        }
        const serverMessage = typeof payload?.message === "string" ? payload.message : "";
        const serverCode = typeof payload?.error === "string" ? payload.error : "";
        if (serverMessage) {
          setError(serverMessage);
          return;
        }
        if (serverCode === "trial_ai_min_days") {
          setError(trialRequiresError);
          return;
        }
        if (serverCode === "trial_ai_used") {
          setError(trialUsedError);
          return;
        }
        throw new Error(payload?.error ?? "AI request failed");
      }
      if (!payload || typeof payload !== "object" || !payload.report || !payload.meta) {
        setError(insightsError);
        return;
      }
      analysisCacheRef.current.set(rangeKey, payload as AnalysisPayload);
      setAnalysis(payload as AnalysisPayload);
      if (payload?.ok === false && (!payload?.report || payload?.report?.isEmpty)) {
        setError(insightsError);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(insightsError);
        return;
      }
      setError(insightsError);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <SurveyReport
        {...reportProps}
        timeseries={series}
        showCta={aiEnabled}
        onCtaClick={handleAnalyze}
        dateRange={range}
        onDateRangeChange={(next) => {
          setRange(next);
          const nextKey = buildRangeKey(next);
          const cached = analysisCacheRef.current.get(nextKey) ?? null;
          setAnalysis(cached);
        }}
      />
      <AiEngagementReportPanel
        open={open}
        onClose={() => setOpen(false)}
        report={reportForPanel}
        locale={locale}
        loading={loading}
        errorMessage={error}
        audience={focusAudience}
      />
    </>
  );
}
