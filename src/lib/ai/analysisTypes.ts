import type { AiEngagementReport } from "@/lib/ai/engagementReport";

export type PeriodKey = "week" | "month" | "quarter" | "half" | "year";
export type ReportScope = "user" | "team" | "org";
export type AnalysisScope = ReportScope;
export type AnalysisLocale = "ru" | "en";

export type ReportContext = {
  scope: ReportScope;
  scopeId: string;
  dateRange: { from: string; to: string };
};

export type TrendPoint = {
  label: string;
  value: number;
  date?: string;
};

export type ComputedMetric = {
  key: string;
  label: string;
  avgScore: number;
  delta: number;
  direction: "up" | "down" | "flat";
  sampleSize: number;
  trendPoints: TrendPoint[];
};

export type ComputedDriver = {
  key: string;
  label: string;
  description: string;
  avgScore: number;
  delta: number;
  sampleSize: number;
  trendPoints: TrendPoint[];
};

export type AnalysisPayload = {
  ok: boolean;
  meta: {
    locale: AnalysisLocale;
    scope: AnalysisScope;
    dateFrom: string;
    dateTo: string;
    sampleSizeTotal: number;
  };
  computed: {
    topCards: ComputedMetric[];
    drivers: ComputedDriver[];
  };
  ai: {
    summary: string;
    focus: Array<{ key: string; title: string; reason: string }>;
    pros: Array<{ title: string; metricKey: string; change: number; explanation: string }>;
    cons: Array<{ title: string; metricKey: string; change: number; explanation: string }>;
    actions: Array<{ title: string; owner: "manager" | "team" | "hr"; difficulty: "easy" | "medium" | "hard"; steps: string[] }>;
  };
  report: AiEngagementReport;
  error?: string;
};
