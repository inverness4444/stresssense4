"use client";

import { useMemo, useState } from "react";
import { SurveyReport, type SurveyReportProps } from "./SurveyReport";
import { AiEngagementReportPanel } from "./AiEngagementReportPanel";
import { generateAiEngagementReport } from "@/lib/ai/engagementReport";

type Props = SurveyReportProps & { periodFrom: string; periodTo: string };

export function SurveyReportWithAiPanel({ periodFrom, periodTo, ...reportProps }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(periodFrom);
  const [to, setTo] = useState(periodTo);
  const locale = reportProps.locale ?? "en";

  const aiReport = useMemo(
    () => generateAiEngagementReport({ from, to }, reportProps.timeseries, locale),
    [from, to, reportProps.timeseries, locale]
  );

  return (
    <>
      <SurveyReport
        {...reportProps}
        onCtaClick={() => setOpen(true)}
      />
      <AiEngagementReportPanel open={open} onClose={() => setOpen(false)} report={aiReport} onChangePeriod={(f, t) => { setFrom(f); setTo(t); }} locale={locale} />
    </>
  );
}
