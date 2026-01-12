"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { EngagementTrendCard, type TrendPoint } from "@/components/EngagementTrendCard";
import type { AiEngagementReport, Driver, TeamFocus, FocusItem, NudgeItem } from "@/lib/ai/engagementReport";
import { t, type Locale } from "@/lib/i18n";

type PanelProps = {
  open: boolean;
  onClose: () => void;
  report: AiEngagementReport;
  onChangePeriod?: (from: string, to: string) => void;
  locale: Locale;
  loading?: boolean;
  errorMessage?: string;
  showPeriodRange?: boolean;
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

export function AiEngagementReportPanel({
  open,
  onClose,
  report,
  onChangePeriod,
  locale,
  loading,
  errorMessage,
  showPeriodRange = true,
}: PanelProps) {
  const [fromDate, setFromDate] = useState(report.period.from);
  const [toDate, setToDate] = useState(report.period.to);
  const dateFormatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US");
  const unitLabel = locale === "ru" ? "пт" : "pt";
  const isEmpty = report.isEmpty === true;
  const isLoading = loading === true;
  const showSkeleton = isLoading && report.summary === "" && report.trends.length === 0;
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
  return (
    <div className={clsx("fixed inset-0 z-[110] flex items-start justify-end bg-slate-900/30 px-3 py-6 transition", open ? "opacity-100" : "pointer-events-none opacity-0")}>
      <div
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t(locale, "aiReportClose")}
          </button>
        </div>

        <div className="max-h-[80vh] space-y-5 overflow-y-auto px-5 py-5">
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
          {showSkeleton ? (
            <section className="space-y-4">
              <div className="h-24 rounded-3xl border border-slate-200 bg-slate-100/60 animate-pulse" />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="h-28 rounded-2xl border border-slate-200 bg-slate-100/60 animate-pulse" />
                <div className="h-28 rounded-2xl border border-slate-200 bg-slate-100/60 animate-pulse" />
              </div>
              <div className="h-40 rounded-3xl border border-slate-200 bg-slate-100/60 animate-pulse" />
            </section>
          ) : isEmpty ? (
            <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{t(locale, "aiReportEmptyTitle")}</p>
              <p className="mt-2 text-sm text-slate-600">{t(locale, "aiReportEmptySubtitle")}</p>
            </section>
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
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
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">{(report.avgEngagement * 10).toFixed(0)}%</div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiPeriodScoreLabel")}</p>
                        <p className="text-sm font-semibold text-slate-900">{report.avgEngagement.toFixed(1)} / 10</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{report.snapshotNote}</p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiTrendsTitle")}</p>
                  <p className="text-sm text-slate-700">{t(locale, "aiTrendsSubtitle")}</p>
                </div>
                <div className="mt-3">
                  <EngagementTrendCard
                    scope="team"
                    title={t(locale, "aiTrendsTitle")}
                    score={report.avgEngagement}
                    delta={report.deltaEngagement}
                    trendLabel={`${dateFormatter.format(new Date(report.period.from))} — ${dateFormatter.format(new Date(report.period.to))}`}
                    participation={report.participationRate}
                    data={report.trends as TrendPoint[]}
                    locale={locale}
                    showOverlay={false}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-700">{report.trendInsight}</p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiDriversTitle")}</p>
                    <p className="text-sm font-semibold text-slate-900">{t(locale, "aiDriversTitle")}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">{t(locale, "aiDriversPositive")}</p>
                    {report.driversPositive.map((d) => (
                      <DriverTag key={d.name} driver={d} locale={locale} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">{t(locale, "aiDriversRisk")}</p>
                    {report.driversRisk.map((d) => (
                      <DriverTag key={d.name} driver={d} locale={locale} />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700">{report.driversSummary}</p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
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

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
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

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiManagerFocusTitle")}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {report.managerFocus.map((f) => (
                    <FocusCard key={f.title} item={f} />
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "aiNudgesTitle")}</p>
                <div className="mt-3">
                  <NudgeList nudges={report.nudges} />
                </div>
              </section>

              <p className="text-[11px] text-slate-500">{report.disclaimer}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
