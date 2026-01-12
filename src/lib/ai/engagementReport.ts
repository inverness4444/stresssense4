import type { TrendPoint } from "@/components/EngagementTrendCard";
import type { Locale } from "@/lib/i18n";

export type DriverSentiment = "positive" | "risk";

export type Driver = {
  name: string;
  score: number;
  delta: number;
  sentiment: DriverSentiment;
};

export type TeamFocusStatus = "risk" | "ok" | "strong";

export type TeamFocus = {
  name: string;
  stress: number;
  engagement: number;
  status: TeamFocusStatus;
  note?: string;
};

export type FocusItem = {
  title: string;
  tags: string[];
  description?: string;
};

export type NudgeItem = {
  text: string;
  tags?: string[];
  steps?: string[];
};

export type AiEngagementReport = {
  period: { from: string; to: string };
  isEmpty?: boolean;
  summary: string;
  snapshotNote: string;
  avgStress: number;
  avgEngagement: number;
  deltaStress: number;
  deltaEngagement: number;
  trends: TrendPoint[];
  trendInsight: string;
  driversPositive: Driver[];
  driversRisk: Driver[];
  driversSummary: string;
  teamsFocus: TeamFocus[];
  participationRate: number;
  participationNote: string;
  managerFocus: FocusItem[];
  nudges: NudgeItem[];
  disclaimer: string;
};

export function createEmptyAiEngagementReport(
  period: { from: string; to: string },
  locale: Locale = "en"
): AiEngagementReport {
  void locale;
  return {
    period,
    isEmpty: true,
    summary: "",
    snapshotNote: "",
    avgStress: 0,
    avgEngagement: 0,
    deltaStress: 0,
    deltaEngagement: 0,
    trends: [],
    trendInsight: "",
    driversPositive: [],
    driversRisk: [],
    driversSummary: "",
    teamsFocus: [],
    participationRate: 0,
    participationNote: "",
    managerFocus: [],
    nudges: [],
    disclaimer: "",
  };
}

export function generateAiEngagementReport(
  period: { from: string; to: string },
  trendPoints?: TrendPoint[],
  locale: Locale = "en"
): AiEngagementReport {
  const start = new Date(period.from);
  const end = new Date(period.to);
  const localeCode = locale === "ru" ? "ru-RU" : "en-US";

  const buildFallbackTrends = () => {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return [
        { label: new Date("2025-07-01").toLocaleDateString(localeCode, { month: "short" }), value: 6.6, date: "2025-07-01" },
        { label: new Date("2025-08-01").toLocaleDateString(localeCode, { month: "short" }), value: 6.7, date: "2025-08-01" },
        { label: new Date("2025-09-01").toLocaleDateString(localeCode, { month: "short" }), value: 6.9, date: "2025-09-01" },
        { label: new Date("2025-10-01").toLocaleDateString(localeCode, { month: "short" }), value: 7.1, date: "2025-10-01" },
        { label: new Date("2025-11-01").toLocaleDateString(localeCode, { month: "short" }), value: 7.0, date: "2025-11-01" },
        { label: new Date("2025-12-01").toLocaleDateString(localeCode, { month: "short" }), value: 7.2, date: "2025-12-01" },
      ];
    }

    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const result: TrendPoint[] = [];
    let value = 6.6;
    let step = 0.1;
    while (cursor <= end) {
      value = Number((value + step).toFixed(1));
      step = Math.max(-0.15, Math.min(0.15, step - 0.02)); // плавное изменение без рандома
      result.push({
        label: cursor.toLocaleDateString(localeCode, { month: "short" }),
        value,
        date: new Date(cursor),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result.length ? result : [
      { label: new Date("2025-07-01").toLocaleDateString(localeCode, { month: "short" }), value: 6.6, date: "2025-07-01" },
      { label: new Date("2025-08-01").toLocaleDateString(localeCode, { month: "short" }), value: 6.7, date: "2025-08-01" },
      { label: new Date("2025-09-01").toLocaleDateString(localeCode, { month: "short" }), value: 6.9, date: "2025-09-01" },
      { label: new Date("2025-10-01").toLocaleDateString(localeCode, { month: "short" }), value: 7.1, date: "2025-10-01" },
      { label: new Date("2025-11-01").toLocaleDateString(localeCode, { month: "short" }), value: 7.0, date: "2025-11-01" },
      { label: new Date("2025-12-01").toLocaleDateString(localeCode, { month: "short" }), value: 7.2, date: "2025-12-01" },
    ];
  };

  const normalized = (trendPoints?.length ? trendPoints : buildFallbackTrends()).map((p, idx) => {
    const parsed = p.date ? new Date(p.date) : undefined;
    const safeDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
    const label = safeDate
      ? safeDate.toLocaleDateString(localeCode, { month: "short" })
      : p.label || `W${idx + 1}`;
    return {
      ...p,
      label,
      value: Number((p.value ?? 0).toFixed(1)),
      _dateValue: safeDate?.getTime(),
      _idx: idx,
    } as TrendPoint & { _dateValue?: number; _idx: number };
  });

  const needSyntheticDates =
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    normalized.some((p) => p._dateValue === undefined);

  const withSyntheticDates = needSyntheticDates
    ? normalized.map((p, idx) => {
        if (p._dateValue !== undefined) return p;
        const total = Math.max(1, normalized.length - 1);
        const step = (end.getTime() - start.getTime()) / total;
        return { ...p, _dateValue: start.getTime() + step * idx };
      })
    : normalized;

  const ensureCoverage = (points: (TrendPoint & { _dateValue?: number; _idx?: number })[]) => {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return points;
    const dated = points.filter((p) => typeof p._dateValue === "number") as (TrendPoint & { _dateValue: number; _idx?: number })[];
    if (!dated.length) return points;
    const sorted = [...dated].sort((a, b) => a._dateValue - b._dateValue);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const augmented = [...points];

    if (start.getTime() < first._dateValue) {
      augmented.unshift({
        ...first,
        label: start.toLocaleDateString(localeCode, { month: "short" }),
        _dateValue: start.getTime(),
      });
    }
    if (end.getTime() > last._dateValue) {
      augmented.push({
        ...last,
        label: end.toLocaleDateString(localeCode, { month: "short" }),
        _dateValue: end.getTime(),
      });
    }
    return augmented;
  };

  const covered = ensureCoverage(withSyntheticDates);

  const filtered = covered.filter((p) => {
    if (!p._dateValue) return true;
    const d = new Date(p._dateValue);
    d.setHours(0, 0, 0, 0);
    return d >= start && d <= end;
  });

  const trends = (filtered.length ? filtered : covered)
    .sort((a, b) => (a._dateValue ?? 0) - (b._dateValue ?? 0) || a._idx - b._idx)
    .map(({ _dateValue, _idx, ...rest }) => rest);

  const values = trends.map((t) => t.value);
  const avgEngagement = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 7.2;
  const deltaEngagement = values.length > 1 ? values[values.length - 1] - values[0] : 0;

  const copyRu = {
    summary: "Состояние команды в целом нормальное, но видны ранние признаки напряжения. Сосредоточьтесь на нагрузке и ясности задач.",
    snapshotNote: "Индекс держится в зоне нормы, но нагрузка начала расти после старта квартала.",
    trendInsight: "После начала квартала нагрузка выросла, вовлечённость чуть просела.",
    driversPositive: [
      { name: "Поддержка менеджера", score: 7.6, delta: 0.3, sentiment: "positive" },
      { name: "Психологическая безопасность", score: 7.9, delta: 0.4, sentiment: "positive" },
      { name: "Признание", score: 7.3, delta: 0.2, sentiment: "positive" },
    ] as Driver[],
    driversRisk: [
      { name: "Нагрузка", score: 5.8, delta: -0.5, sentiment: "risk" },
      { name: "Баланс работа/жизнь", score: 6.0, delta: -0.4, sentiment: "risk" },
      { name: "Согласованность целей", score: 6.3, delta: -0.2, sentiment: "risk" },
    ] as Driver[],
    driversSummary: "Главный источник стресса сейчас — нагрузка и сроки, особенно в продуктовых командах.",
    teamsFocus: [
      { name: "Product Core", stress: 7.4, engagement: 6.8, status: "risk", note: "Дедлайны и высокая загрузка" },
      { name: "Platform", stress: 6.2, engagement: 7.5, status: "ok", note: "Стабильная динамика" },
      { name: "CX & Support", stress: 5.6, engagement: 7.8, status: "strong", note: "Хорошая поддержка и ротация задач" },
    ] as TeamFocus[],
    participationNote: "Чем выше участие, тем надёжнее выводы. Сейчас участие в норме, но можно чуть поднять его в инженерной команде.",
    managerFocus: [
      { title: "Снизить шум митингов", tags: ["workload", "meetings"], description: "Соберите митинги в блоки, оставьте 1–2 фокус-блока без встреч." },
      { title: "Уточнить 3 главных приоритета на спринт", tags: ["clarity"], description: "Зашейте три результата спринта и донесите их в понедельник." },
      { title: "Усилить поддержку перегруженных людей", tags: ["support", "wellbeing"], description: "Проверьте нагрузку в Product Core, предложите перераспределение задач." },
      { title: "План работ без переработок", tags: ["workload"], description: "Пересмотрите сроки крупных задач, оставьте буфер." },
    ] as FocusItem[],
    nudges: [
      { text: "Забронируйте один фокус-блок без встреч в день", tags: ["focus"] },
      { text: "В конце митинга фиксируйте, кто что делает и к какому сроку", tags: ["clarity"] },
      { text: "Спросите команду, что больше всего мешает сфокусироваться на этой неделе", tags: ["feedback"] },
    ] as NudgeItem[],
    disclaimer:
      "Этот отчёт создан ИИ и отражает только организацию работы и стресс на работе. Это не медицинский и не психологический диагноз. При сильном ухудшении самочувствия важно обратиться к специалисту.",
  };

  const copyEn = {
    summary: "The team is mostly stable, but early tension signals are visible. Focus on workload and clarity of priorities.",
    snapshotNote: "The index stays in the normal zone, but workload started to rise after the quarter began.",
    trendInsight: "After the quarter kicked off, workload grew and engagement dipped slightly.",
    driversPositive: [
      { name: "Manager support", score: 7.6, delta: 0.3, sentiment: "positive" },
      { name: "Psychological safety", score: 7.9, delta: 0.4, sentiment: "positive" },
      { name: "Recognition", score: 7.3, delta: 0.2, sentiment: "positive" },
    ] as Driver[],
    driversRisk: [
      { name: "Workload", score: 5.8, delta: -0.5, sentiment: "risk" },
      { name: "Work-life balance", score: 6.0, delta: -0.4, sentiment: "risk" },
      { name: "Goal alignment", score: 6.3, delta: -0.2, sentiment: "risk" },
    ] as Driver[],
    driversSummary: "The main source of stress now is workload and deadlines, especially in product teams.",
    teamsFocus: [
      { name: "Product Core", stress: 7.4, engagement: 6.8, status: "risk", note: "Tight deadlines and high load" },
      { name: "Platform", stress: 6.2, engagement: 7.5, status: "ok", note: "Stable trend" },
      { name: "CX & Support", stress: 5.6, engagement: 7.8, status: "strong", note: "Good support and task rotation" },
    ] as TeamFocus[],
    participationNote: "Higher participation makes insights more reliable. It’s fine now, but you can lift it a bit in Engineering.",
    managerFocus: [
      { title: "Reduce meeting noise", tags: ["workload", "meetings"], description: "Bundle meetings into blocks and leave 1–2 focus blocks without calls." },
      { title: "Clarify the top 3 sprint priorities", tags: ["clarity"], description: "Lock three sprint outcomes and communicate them on Monday." },
      { title: "Support overloaded people", tags: ["support", "wellbeing"], description: "Check workload in Product Core and reassign tasks where needed." },
      { title: "Plan work without overtime", tags: ["workload"], description: "Review timelines for big tasks and keep a buffer." },
    ] as FocusItem[],
    nudges: [
      { text: "Book one focus block without meetings each day", tags: ["focus"] },
      { text: "Close every meeting with who does what and by when", tags: ["clarity"] },
      { text: "Ask the team what blocks focus the most this week", tags: ["feedback"] },
    ] as NudgeItem[],
    disclaimer:
      "This report is generated by AI and only reflects work organization and stress at work. It is not a medical or psychological diagnosis. If wellbeing worsens, please contact a specialist.",
  };

  const localized = locale === "ru" ? copyRu : copyEn;

  return {
    period,
    isEmpty: false,
    summary: localized.summary,
    snapshotNote: localized.snapshotNote,
    avgStress: 6.8,
    avgEngagement: Number(avgEngagement.toFixed(1)),
    deltaStress: 0.6,
    deltaEngagement: Number(deltaEngagement.toFixed(1)),
    trends,
    trendInsight: localized.trendInsight,
    driversPositive: localized.driversPositive,
    driversRisk: localized.driversRisk,
    driversSummary: localized.driversSummary,
    teamsFocus: localized.teamsFocus,
    participationRate: 78,
    participationNote: localized.participationNote,
    managerFocus: localized.managerFocus,
    nudges: localized.nudges,
    disclaimer: localized.disclaimer,
  };
}
