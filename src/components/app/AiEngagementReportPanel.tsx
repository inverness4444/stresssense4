"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { EngagementTrendCard, type TrendPoint } from "@/components/EngagementTrendCard";
import type { AiEngagementReport, Driver, TeamFocus, FocusItem, NudgeItem } from "@/lib/ai/engagementReport";
import { t, type Locale } from "@/lib/i18n";
import { PDFDocument } from "pdf-lib";
import { toPng } from "html-to-image";

type PanelProps = {
  open: boolean;
  onClose: () => void;
  report: AiEngagementReport;
  onChangePeriod?: (from: string, to: string) => void;
  locale: Locale;
  loading?: boolean;
  errorMessage?: string;
  showPeriodRange?: boolean;
  audience?: "employee" | "manager";
  autoDownload?: boolean;
  onAutoDownloadDone?: () => void;
};

function DriverTag({ driver, locale }: { driver: Driver; locale: Locale }) {
  const tone =
    driver.sentiment === "positive"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";
  const deltaTone =
    driver.delta > 0 ? "text-emerald-700" : driver.delta < 0 ? "text-rose-700" : "text-slate-600";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
        <span>{driver.name}</span>
        <span className={clsx("text-xs font-semibold rounded-full px-2 py-1 ring-1", tone)}>
          {driver.sentiment === "positive" ? t(locale, "aiDriverPositiveBadge") : t(locale, "aiDriverRiskBadge")}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
        <span className="text-base font-semibold text-slate-900">{driver.score.toFixed(1)}</span>
        <span className={clsx("text-xs font-semibold", deltaTone)}>
          {driver.delta > 0 ? "↑" : driver.delta < 0 ? "↓" : "•"} {driver.delta.toFixed(1)} pt
        </span>
      </div>
    </div>
  );
}

function TeamBadge({ team, locale }: { team: TeamFocus; locale: Locale }) {
  const statusTone =
    team.status === "risk" ? "bg-rose-50 text-rose-700 ring-rose-200" : team.status === "strong" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-blue-50 text-blue-700 ring-blue-200";
  const statusLabel =
    team.status === "risk" ? t(locale, "aiTeamStatusRisk") : team.status === "strong" ? t(locale, "aiTeamStatusStrong") : t(locale, "aiTeamStatusOk");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{team.name}</p>
          <p className="text-xs text-slate-600">
            {t(locale, "aiTeamMetricsLabel")
              .replace("{{stress}}", team.stress.toFixed(1))
              .replace("{{engagement}}", team.engagement.toFixed(1))}
          </p>
          {team.note && <p className="text-xs text-slate-500">{team.note}</p>}
        </div>
        <span className={clsx("rounded-full px-3 py-1 text-[11px] font-semibold ring-1", statusTone)}>{statusLabel}</span>
      </div>
    </div>
  );
}

function FocusCard({ item }: { item: FocusItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
      {item.description && <p className="mt-1 text-xs text-slate-600">{item.description}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {item.tags.map((t) => (
          <span key={t} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function NudgeList({ nudges }: { nudges: NudgeItem[] }) {
  return (
    <ul className="space-y-2">
      {nudges.map((n) => (
        <li key={n.text} className="flex items-start gap-2 text-sm text-slate-800">
          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
          <div>
            <p className="font-semibold text-slate-900">{n.text}</p>
            {n.tags && (
              <div className="mt-1 flex flex-wrap gap-2">
                {n.tags.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {n.steps && n.steps.length > 0 && (
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-600">
                {n.steps.map((step, idx) => (
                  <li key={`${n.text}-step-${idx}`}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

const PDF_PAGE = { width: 595.28, height: 841.89 };

export function AiEngagementReportPanel({
  open,
  onClose,
  report,
  onChangePeriod,
  locale,
  loading,
  errorMessage,
  showPeriodRange = true,
  audience = "manager",
  autoDownload,
  onAutoDownloadDone,
}: PanelProps) {
  const [fromDate, setFromDate] = useState(report.period.from);
  const [toDate, setToDate] = useState(report.period.to);
  const [downloading, setDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = "ai-engagement-report";
  const dateFormatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US");
  const unitLabel = locale === "ru" ? "пт" : "pt";
  const focusTitleKey = audience === "employee" ? "aiEmployeeFocusTitle" : "aiManagerFocusTitle";
  const isEmpty = report.isEmpty === true;
  const isLoading = loading === true;
  const showLoadingScreen = isLoading;
  const stressDeltaTone =
    report.deltaStress > 0 ? "text-emerald-700" : report.deltaStress < 0 ? "text-rose-600" : "text-slate-600";

  useEffect(() => {
    setFromDate(report.period.from);
    setToDate(report.period.to);
  }, [report.period.from, report.period.to]);

  const applyCustomRange = () => {
    if (!onChangePeriod || !fromDate || !toDate) return;
    onChangePeriod(fromDate, toDate);
  };

  const handleDownloadPdf = useCallback(async () => {
    if (downloading || isEmpty || isLoading || !panelRef.current) return;
    setDownloading(true);
    setIsExporting(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const panel = panelRef.current;
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      const panelRect = panel.getBoundingClientRect();
      const panelWidth = Math.ceil(panelRect.width);
      const pageHeightCss = panelWidth * (PDF_PAGE.height / PDF_PAGE.width);
      const blocks = Array.from(panel.querySelectorAll<HTMLElement>("[data-pdf-block]"));
      const blockCandidates = blocks.length ? blocks : Array.from(panel.querySelectorAll<HTMLElement>("section"));
      const blockRects = blockCandidates
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            top: rect.top - panelRect.top,
            bottom: rect.bottom - panelRect.top,
          };
        })
        .filter((rect) => rect.bottom > rect.top);
      const pageBreaksCss: number[] = [0];
      let currentStart = 0;
      blockRects.forEach((rect) => {
        const blockHeight = rect.bottom - rect.top;
        if (blockHeight > pageHeightCss) {
          if (rect.top > currentStart) {
            pageBreaksCss.push(rect.top);
            currentStart = rect.top;
          }
          return;
        }
        if (rect.bottom - currentStart > pageHeightCss) {
          pageBreaksCss.push(rect.top);
          currentStart = rect.top;
        }
      });
      const normalizedBreaksCss = Array.from(new Set(pageBreaksCss)).sort((a, b) => a - b);
      const pngData = await toPng(panel, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio,
        style: {
          maxHeight: "none",
          overflow: "visible",
        },
      });
      const image = new Image();
      const imageLoaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to load report image"));
      });
      image.src = pngData;
      await imageLoaded;
      const imageWidth = image.width;
      const imageHeight = image.height;
      const pageHeightPx = (imageWidth * PDF_PAGE.height) / PDF_PAGE.width;
      const pageBreaksPx = normalizedBreaksCss.map((value) => Math.round(value * pixelRatio));
      if (pageBreaksPx.length === 0) pageBreaksPx.push(0);
      if (pageBreaksPx[0] !== 0) pageBreaksPx.unshift(0);
      pageBreaksPx.push(imageHeight);
      const pdfDoc = await PDFDocument.create();
      const scale = PDF_PAGE.width / imageWidth;
      const offsetX = 0;
      for (let i = 0; i < pageBreaksPx.length - 1; i += 1) {
        let start = pageBreaksPx[i];
        let end = pageBreaksPx[i + 1];
        if (end <= start) continue;
        let sliceHeight = end - start;
        if (sliceHeight > pageHeightPx) {
          const pageCount = Math.ceil(sliceHeight / pageHeightPx);
          for (let j = 0; j < pageCount; j += 1) {
            const subStart = start + j * pageHeightPx;
            const subEnd = Math.min(start + (j + 1) * pageHeightPx, end);
            const subHeight = Math.max(1, Math.round(subEnd - subStart));
            const canvas = document.createElement("canvas");
            canvas.width = imageWidth;
            canvas.height = subHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) continue;
            ctx.drawImage(image, 0, subStart, imageWidth, subHeight, 0, 0, imageWidth, subHeight);
            const sliceData = canvas.toDataURL("image/png");
            const pngImage = await pdfDoc.embedPng(sliceData);
            const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height]);
            const scaledHeight = subHeight * scale;
            page.drawImage(pngImage, {
              x: offsetX,
              y: PDF_PAGE.height - scaledHeight,
              width: PDF_PAGE.width,
              height: scaledHeight,
            });
          }
          continue;
        }
        const canvas = document.createElement("canvas");
        canvas.width = imageWidth;
        canvas.height = sliceHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.drawImage(image, 0, start, imageWidth, sliceHeight, 0, 0, imageWidth, sliceHeight);
        const sliceData = canvas.toDataURL("image/png");
        const pngImage = await pdfDoc.embedPng(sliceData);
        const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height]);
        const scaledHeight = sliceHeight * scale;
        page.drawImage(pngImage, {
          x: offsetX,
          y: PDF_PAGE.height - scaledHeight,
          width: PDF_PAGE.width,
          height: scaledHeight,
        });
      }
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stresssense-engagement-${report.period.from}-${report.period.to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
      setDownloading(false);
    }
  }, [downloading, isEmpty, isLoading, report.period.from, report.period.to]);

  useEffect(() => {
    if (!autoDownload || !open) return;
    let active = true;
    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      if (!active) return;
      await handleDownloadPdf();
      if (active) onAutoDownloadDone?.();
    };
    run();
    return () => {
      active = false;
    };
  }, [autoDownload, open, handleDownloadPdf, onAutoDownloadDone]);
  return (
    <div className={clsx("fixed inset-0 z-[110] flex items-start justify-end bg-slate-900/30 px-3 py-6 transition", open ? "opacity-100" : "pointer-events-none opacity-0")}>
      <div
        ref={panelRef}
        id={panelId}
        className={clsx(
          "w-full max-w-4xl transform rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 transition-all",
          open ? "translate-y-0" : "translate-y-6"
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiReportBadge")}</p>
            <p className="text-lg font-semibold text-slate-900">{t(locale, "aiReportTitle")}</p>
            {showPeriodRange && (
              <p className="text-sm text-slate-600">
                {dateFormatter.format(new Date(report.period.from))} — {dateFormatter.format(new Date(report.period.to))}
              </p>
            )}
          </div>
          <div className={clsx("flex items-center gap-2", isExporting && "invisible")}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading || isEmpty || isLoading}
              className={clsx(
                "rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50",
                (downloading || isEmpty || isLoading) && "cursor-not-allowed opacity-60"
              )}
            >
              {downloading ? t(locale, "aiReportDownloadingPdf") : t(locale, "aiReportDownloadPdf")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t(locale, "aiReportClose")}
            </button>
          </div>
        </div>

        <div className={clsx("max-h-[80vh] space-y-5 overflow-y-auto px-5 py-5", isExporting && "max-h-none overflow-visible")}>
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
          {showLoadingScreen ? (
            <section className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 px-6 py-16 text-center shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
              <p className="text-sm font-semibold text-slate-900">{t(locale, "aiReportLoadingTitle")}</p>
              <p className="text-xs text-slate-500">{t(locale, "aiReportLoadingSubtitle")}</p>
            </section>
          ) : isEmpty ? (
            <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{t(locale, "aiReportEmptyTitle")}</p>
              <p className="mt-2 text-sm text-slate-600">{t(locale, "aiReportEmptySubtitle")}</p>
            </section>
          ) : (
            <>
              <section data-pdf-block className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiSnapshotTitle")}</p>
                    <p className="text-sm text-slate-700">{report.summary}</p>
                  </div>
                </div>
                {onChangePeriod && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t(locale, "aiDateFrom")}
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t(locale, "aiDateTo")}
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={applyCustomRange}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-slate-50"
                    >
                      {t(locale, "aiApplyPeriod")}
                    </button>
                  </div>
                )}
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t(locale, "aiStressIndexLabel")}</p>
                      <p className="text-lg font-semibold text-slate-900">{report.avgStress.toFixed(1)}</p>
                    </div>
                    <span className={clsx("text-sm font-semibold", stressDeltaTone)}>
                      {report.deltaStress > 0 ? "+" : ""}
                      {report.deltaStress.toFixed(1)} {unitLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t(locale, "aiEngagementLabel")}</p>
                      <p className="text-lg font-semibold text-slate-900">{report.avgEngagement.toFixed(1)}</p>
                    </div>
                    <span className="text-sm font-semibold text-rose-600">
                      {report.deltaEngagement >= 0 ? "+" : ""}
                      {report.deltaEngagement.toFixed(1)} {unitLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12">
                        <div className="absolute inset-0 rounded-full bg-slate-100" />
                        <svg className="absolute inset-0 h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                          <path
                            className="text-slate-200"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            fill="none"
                            d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-primary"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            fill="none"
                            strokeDasharray={`${Math.min(100, Math.max(0, report.avgEngagement * 10)).toFixed(1)}, 100`}
                            d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">{(report.avgStress * 10).toFixed(0)}%</div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiPeriodScoreLabel")}</p>
                        <p className="text-sm font-semibold text-slate-900">{report.avgStress.toFixed(1)} / 10</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{report.snapshotNote}</p>
              </section>

              <section data-pdf-block className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiTrendsTitle")}</p>
                  <p className="text-sm text-slate-700">{t(locale, "aiTrendsSubtitle")}</p>
                </div>
                <div className="mt-3">
                  <EngagementTrendCard
                    scope="team"
                    title={t(locale, "aiTrendsTitle")}
                    score={report.avgStress}
                    delta={report.deltaStress}
                    trendLabel={`${dateFormatter.format(new Date(report.period.from))} — ${dateFormatter.format(new Date(report.period.to))}`}
                    participation={report.participationRate}
                    data={report.trends as TrendPoint[]}
                    locale={locale}
                    showOverlay={false}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-700">{report.trendInsight}</p>
              </section>

              <section data-pdf-block className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiDriversTitle")}</p>
                    <p className="text-sm font-semibold text-slate-900">{t(locale, "aiDriversTitle")}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">{t(locale, "aiDriversPositive")}</p>
                    {report.driversPositive.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        {locale === "ru" ? "Нет выраженных драйверов роста." : "No clear positive drivers."}
                      </p>
                    ) : (
                      report.driversPositive.map((d, idx) => (
                        <DriverTag key={`${d.name}-${idx}`} driver={d} locale={locale} />
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">{t(locale, "aiDriversRisk")}</p>
                    {report.driversRisk.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        {locale === "ru" ? "Явных рисков не выявлено." : "No clear risks detected."}
                      </p>
                    ) : (
                      report.driversRisk.map((d, idx) => (
                        <DriverTag key={`${d.name}-${idx}`} driver={d} locale={locale} />
                      ))
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700">{report.driversSummary}</p>
              </section>

              <section data-pdf-block className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiTeamsTitle")}</p>
                    <p className="text-sm text-slate-700">{t(locale, "aiTeamsTitle")}</p>
                  </div>
                </div>
                {report.teamsFocus.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">{t(locale, "aiTeamsEmpty")}</p>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {report.teamsFocus.map((team) => (
                      <TeamBadge key={team.name} team={team} locale={locale} />
                    ))}
                  </div>
                )}
              </section>

              <section data-pdf-block className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiParticipationTitle")}</p>
                    <p className="text-sm text-slate-700">
                      {t(locale, "aiParticipationTitle")}: {report.participationRate}%
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-700">{report.participationNote}</p>
              </section>

              <section data-pdf-block className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, focusTitleKey)}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {report.managerFocus.map((f) => (
                    <FocusCard key={f.title} item={f} />
                  ))}
                </div>
              </section>

              <section data-pdf-block className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiNudgesTitle")}</p>
                <div className="mt-3">
                  <NudgeList nudges={report.nudges} />
                </div>
              </section>

              <p data-pdf-block className="text-[11px] text-slate-500">
                {report.disclaimer}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
