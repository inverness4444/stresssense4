"use client";
import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import { SurveyReport, type SurveyTimeseriesPointWithDate } from "@/components/app/SurveyReport";
import { AiEngagementReportPanel } from "@/components/app/AiEngagementReportPanel";
import type { Locale } from "@/lib/i18n";
import { generateAiEngagementReport, type AiEngagementReport } from "@/lib/ai/engagementReport";

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDateValue = (date: Date) => format(date, "yyyy-MM-dd");

const createSeededRandom = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

const demoTeams = [
  { name: "Product", stress: 7.2, engagement: 7.8, participation: 82, status: "Watch" },
  { name: "Marketing", stress: 8.1, engagement: 6.5, participation: 71, status: "At risk" },
  { name: "Ops", stress: 6.4, engagement: 7.1, participation: 76, status: "Watch" },
];

const demoStressScores: Record<"week" | "month" | "year", number> = {
  week: 7.1,
  month: 5.3,
  year: 3.4,
};

const demoEngagementScores: Record<"week" | "month" | "year", number> = {
  week: 5.9,
  month: 6.4,
  year: 7.6,
};

const demoTrendValues: Record<"week" | "month" | "year", number[]> = {
  week: [5.7, 5.9, 6.1, 6.0, 6.2, 5.8, 6.0],
  month: [6.1, 6.2, 6.4, 6.5, 6.3, 6.4],
  year: [7.2, 7.3, 7.5, 7.6, 7.7, 7.6, 7.5, 7.7, 7.8, 7.4, 7.5, 7.6],
};

type DemoReportOverride = Pick<
  AiEngagementReport,
  | "summary"
  | "snapshotNote"
  | "avgStress"
  | "avgEngagement"
  | "deltaStress"
  | "deltaEngagement"
  | "trendInsight"
  | "driversPositive"
  | "driversRisk"
  | "driversSummary"
  | "teamsFocus"
  | "participationRate"
  | "participationNote"
  | "managerFocus"
  | "nudges"
>;

const demoReportOverridesRu: Record<"week" | "month" | "year", DemoReportOverride> = {
  week: {
    summary: "Неделя напряжённая: стресс вырос до 7.1, вовлечённость держится на 5.9. Нужен фокус на нагрузке и приоритетах.",
    snapshotNote: "Пики стресса ближе к концу недели, признание и ясность просели.",
    avgStress: demoStressScores.week,
    avgEngagement: demoEngagementScores.week,
    deltaStress: 0.6,
    deltaEngagement: 0.3,
    trendInsight: "После середины недели стресс начал расти, вовлечённость колеблется около среднего уровня.",
    driversPositive: [
      { name: "Поддержка менеджера", score: 6.8, delta: 0.2, sentiment: "positive" },
      { name: "Командная связь", score: 6.5, delta: 0.1, sentiment: "positive" },
      { name: "Обратная связь", score: 6.7, delta: 0.2, sentiment: "positive" },
    ],
    driversRisk: [
      { name: "Нагрузка", score: 5.1, delta: -0.6, sentiment: "risk" },
      { name: "Срочные задачи", score: 5.4, delta: -0.3, sentiment: "risk" },
      { name: "Ясность приоритетов", score: 5.6, delta: -0.4, sentiment: "risk" },
    ],
    driversSummary: "Главный риск недели — перегрузка и размытые приоритеты к пятнице.",
    teamsFocus: [
      { name: "Product", stress: 7.6, engagement: 5.8, status: "risk", note: "Сжатые сроки релиза" },
      { name: "Marketing", stress: 7.1, engagement: 6.0, status: "risk", note: "Много срочных задач" },
      { name: "Ops", stress: 6.2, engagement: 6.4, status: "ok", note: "Стабильная нагрузка" },
    ],
    participationRate: 74,
    participationNote: "Участие на уровне 74%. В командах поддержки и операций есть потенциал для роста.",
    managerFocus: [
      { title: "Снять срочные задачи к пятнице", tags: ["нагрузка", "планирование"], description: "Разделите критичные задачи и перенесите остальное." },
      { title: "Уточнить 3 приоритета недели", tags: ["ясность", "фокус"], description: "Согласуйте ключевые результаты в понедельник." },
      { title: "Сделать короткий пульс-чек", tags: ["поддержка"], description: "Проверьте перегруженных людей и перераспределите задачи." },
      { title: "Сократить встречи", tags: ["митинги"], description: "Оставьте 1–2 фокус-блока без встреч." },
    ],
    nudges: [
      { text: "Дайте 10-минутный апдейт по приоритетам в понедельник", tags: ["ясность"] },
      { text: "Спросите команду, что мешает фокусу прямо сейчас", tags: ["фокус"] },
      { text: "Отметьте одну хорошую работу публично", tags: ["признание"] },
    ],
  },
  month: {
    summary: "За месяц стресс снизился до 5.3, вовлечённость выросла до 6.4. Видно восстановление устойчивого ритма.",
    snapshotNote: "После первой недели нагрузка стабилизировалась, выросла ясность задач и признание.",
    avgStress: demoStressScores.month,
    avgEngagement: demoEngagementScores.month,
    deltaStress: -0.4,
    deltaEngagement: 0.4,
    trendInsight: "Во второй половине месяца заметен устойчивый рост вовлечённости.",
    driversPositive: [
      { name: "Признание", score: 7.2, delta: 0.4, sentiment: "positive" },
      { name: "Ясность задач", score: 6.9, delta: 0.3, sentiment: "positive" },
      { name: "Поддержка менеджера", score: 7.1, delta: 0.2, sentiment: "positive" },
    ],
    driversRisk: [
      { name: "Нагрузка", score: 5.7, delta: -0.1, sentiment: "risk" },
      { name: "Баланс работа/жизнь", score: 5.9, delta: -0.2, sentiment: "risk" },
      { name: "Темп изменений", score: 6.0, delta: -0.2, sentiment: "risk" },
    ],
    driversSummary: "Риск остаётся в нагрузке, но динамика улучшается по сравнению с началом месяца.",
    teamsFocus: [
      { name: "Product", stress: 6.1, engagement: 6.6, status: "ok", note: "Более ровный ритм" },
      { name: "Marketing", stress: 5.6, engagement: 6.2, status: "ok", note: "Стабильные спринты" },
      { name: "Ops", stress: 4.9, engagement: 6.8, status: "strong", note: "Улучшилась поддержка" },
    ],
    participationRate: 78,
    participationNote: "Участие на уровне 78%. Есть шанс поднять отклик в продажах и поддержке.",
    managerFocus: [
      { title: "Подсветить успехи команды", tags: ["признание"], description: "Разберите 2–3 лучших достижения за месяц." },
      { title: "Синхронизировать ожидания со стейкхолдерами", tags: ["ясность"], description: "Обновите приоритеты и сроки на весь месяц." },
      { title: "Сохранить ритм проверок", tags: ["поддержка"], description: "Оставьте регулярные 1:1 и короткие апдейты." },
      { title: "Пересмотреть план спринта", tags: ["нагрузка"], description: "Сократите хвост задач без критичности." },
    ],
    nudges: [
      { text: "Проведите 2 коротких 1:1 в середине месяца", tags: ["поддержка"] },
      { text: "Закрывайте задачи в пятницу и фиксируйте итоги", tags: ["ясность"] },
      { text: "Публикуйте небольшой дайджест успехов команды", tags: ["признание"] },
    ],
  },
  year: {
    summary: "За год стресс снизился до 3.4, вовлечённость выросла до 7.6. Команды вошли в устойчивый ритм.",
    snapshotNote: "Системные практики и прозрачные приоритеты стабилизировали состояние.",
    avgStress: demoStressScores.year,
    avgEngagement: demoEngagementScores.year,
    deltaStress: -1.2,
    deltaEngagement: 0.8,
    trendInsight: "Во второй половине года вовлечённость росла быстрее, стресс оставался низким.",
    driversPositive: [
      { name: "Поддержка менеджера", score: 8.1, delta: 0.6, sentiment: "positive" },
      { name: "Псих. безопасность", score: 8.3, delta: 0.5, sentiment: "positive" },
      { name: "Признание", score: 7.9, delta: 0.4, sentiment: "positive" },
    ],
    driversRisk: [
      { name: "Пиковая нагрузка", score: 6.2, delta: -0.2, sentiment: "risk" },
      { name: "Согласованность целей", score: 6.5, delta: -0.1, sentiment: "risk" },
      { name: "Смена приоритетов", score: 6.3, delta: -0.2, sentiment: "risk" },
    ],
    driversSummary: "Риски локальные и связаны с квартальными пиками и изменением приоритетов.",
    teamsFocus: [
      { name: "Product", stress: 4.0, engagement: 7.4, status: "strong", note: "Стабильный темп" },
      { name: "Marketing", stress: 3.6, engagement: 7.2, status: "strong", note: "Рост вовлечённости" },
      { name: "Ops", stress: 3.2, engagement: 7.8, status: "strong", note: "Ровная нагрузка" },
    ],
    participationRate: 82,
    participationNote: "Участие 82% — это надёжная база для годовых выводов и планирования.",
    managerFocus: [
      { title: "Сохранить ритм ретро", tags: ["ритм", "поддержка"], description: "Оставьте регулярные ретро и пункты действий." },
      { title: "Масштабировать лучшие практики", tags: ["процессы"], description: "Перенесите удачные практики между командами." },
      { title: "Планировать Q1 заранее", tags: ["планирование"], description: "Закладывайте буферы под пиковые периоды." },
      { title: "Поддерживать культуру признания", tags: ["признание"], description: "Фиксируйте вклад команд ежемесячно." },
    ],
    nudges: [
      { text: "Оставьте квартальный буфер под пик задач", tags: ["нагрузка"] },
      { text: "Закрепите программу признания раз в месяц", tags: ["признание"] },
      { text: "Проводите опрос о нагрузке раз в квартал", tags: ["нагрузка", "опрос"] },
    ],
  },
};

const demoReportOverridesEn: Record<"week" | "month" | "year", DemoReportOverride> = {
  week: {
    summary: "The week was tense: stress climbed to 7.1 while engagement stayed around 5.9. Focus on workload and priorities.",
    snapshotNote: "Stress spikes appear near the end of the week; recognition and clarity dipped.",
    avgStress: demoStressScores.week,
    avgEngagement: demoEngagementScores.week,
    deltaStress: 0.6,
    deltaEngagement: 0.3,
    trendInsight: "After mid-week, stress kept rising and engagement fluctuated around the midline.",
    driversPositive: [
      { name: "Manager support", score: 6.8, delta: 0.2, sentiment: "positive" },
      { name: "Team connection", score: 6.5, delta: 0.1, sentiment: "positive" },
      { name: "Feedback", score: 6.7, delta: 0.2, sentiment: "positive" },
    ],
    driversRisk: [
      { name: "Workload", score: 5.1, delta: -0.6, sentiment: "risk" },
      { name: "Urgent tasks", score: 5.4, delta: -0.3, sentiment: "risk" },
      { name: "Priority clarity", score: 5.6, delta: -0.4, sentiment: "risk" },
    ],
    driversSummary: "The main weekly risk is overload and fuzzy priorities by Friday.",
    teamsFocus: [
      { name: "Product", stress: 7.6, engagement: 5.8, status: "risk", note: "Tight release window" },
      { name: "Marketing", stress: 7.1, engagement: 6.0, status: "risk", note: "Lots of urgent tasks" },
      { name: "Ops", stress: 6.2, engagement: 6.4, status: "ok", note: "Stable load" },
    ],
    participationRate: 74,
    participationNote: "Participation is 74%. Support and ops teams can lift it further.",
    managerFocus: [
      { title: "Remove urgent tasks by Friday", tags: ["workload", "planning"], description: "Split critical work and defer the rest." },
      { title: "Lock 3 weekly priorities", tags: ["clarity", "focus"], description: "Agree on key outcomes on Monday." },
      { title: "Run a quick pulse check", tags: ["support"], description: "Check overloaded people and rebalance tasks." },
      { title: "Reduce meeting load", tags: ["meetings"], description: "Leave 1–2 focus blocks without calls." },
    ],
    nudges: [
      { text: "Share a 10-minute priority update on Monday", tags: ["clarity"] },
      { text: "Ask the team what blocks focus right now", tags: ["focus"] },
      { text: "Publicly recognize one win", tags: ["recognition"] },
    ],
  },
  month: {
    summary: "Over the month, stress dropped to 5.3 and engagement rose to 6.4. The rhythm stabilized.",
    snapshotNote: "After the first week, workload settled and clarity improved.",
    avgStress: demoStressScores.month,
    avgEngagement: demoEngagementScores.month,
    deltaStress: -0.4,
    deltaEngagement: 0.4,
    trendInsight: "Engagement rises steadily in the second half of the month.",
    driversPositive: [
      { name: "Recognition", score: 7.2, delta: 0.4, sentiment: "positive" },
      { name: "Task clarity", score: 6.9, delta: 0.3, sentiment: "positive" },
      { name: "Manager support", score: 7.1, delta: 0.2, sentiment: "positive" },
    ],
    driversRisk: [
      { name: "Workload", score: 5.7, delta: -0.1, sentiment: "risk" },
      { name: "Work-life balance", score: 5.9, delta: -0.2, sentiment: "risk" },
      { name: "Change pace", score: 6.0, delta: -0.2, sentiment: "risk" },
    ],
    driversSummary: "Workload remains the key risk, but the trend is improving versus month start.",
    teamsFocus: [
      { name: "Product", stress: 6.1, engagement: 6.6, status: "ok", note: "More even rhythm" },
      { name: "Marketing", stress: 5.6, engagement: 6.2, status: "ok", note: "Stable sprints" },
      { name: "Ops", stress: 4.9, engagement: 6.8, status: "strong", note: "Support improved" },
    ],
    participationRate: 78,
    participationNote: "Participation is 78%. Sales and support can lift it further.",
    managerFocus: [
      { title: "Highlight team wins", tags: ["recognition"], description: "Share 2–3 best results this month." },
      { title: "Sync expectations with stakeholders", tags: ["clarity"], description: "Refresh monthly priorities and dates." },
      { title: "Keep the check-in rhythm", tags: ["support"], description: "Maintain regular 1:1s and updates." },
      { title: "Rebalance sprint load", tags: ["workload"], description: "Trim non-critical tasks from the backlog." },
    ],
    nudges: [
      { text: "Run two short 1:1s mid-month", tags: ["support"] },
      { text: "Close Friday with a short recap", tags: ["clarity"] },
      { text: "Publish a small success digest", tags: ["recognition"] },
    ],
  },
  year: {
    summary: "Over the year, stress dropped to 3.4 and engagement climbed to 7.6. Teams are in a steady rhythm.",
    snapshotNote: "Systemic practices and clear priorities stabilized the baseline.",
    avgStress: demoStressScores.year,
    avgEngagement: demoEngagementScores.year,
    deltaStress: -1.2,
    deltaEngagement: 0.8,
    trendInsight: "In the second half of the year engagement accelerated while stress stayed low.",
    driversPositive: [
      { name: "Manager support", score: 8.1, delta: 0.6, sentiment: "positive" },
      { name: "Psych safety", score: 8.3, delta: 0.5, sentiment: "positive" },
      { name: "Recognition", score: 7.9, delta: 0.4, sentiment: "positive" },
    ],
    driversRisk: [
      { name: "Peak workload", score: 6.2, delta: -0.2, sentiment: "risk" },
      { name: "Goal alignment", score: 6.5, delta: -0.1, sentiment: "risk" },
      { name: "Priority shifts", score: 6.3, delta: -0.2, sentiment: "risk" },
    ],
    driversSummary: "Risks are local and tied to quarterly peaks and shifting priorities.",
    teamsFocus: [
      { name: "Product", stress: 4.0, engagement: 7.4, status: "strong", note: "Stable pace" },
      { name: "Marketing", stress: 3.6, engagement: 7.2, status: "strong", note: "Engagement growth" },
      { name: "Ops", stress: 3.2, engagement: 7.8, status: "strong", note: "Even load" },
    ],
    participationRate: 82,
    participationNote: "Participation is 82% — a solid base for annual planning.",
    managerFocus: [
      { title: "Keep retro rhythm", tags: ["cadence", "support"], description: "Keep regular retros and action items." },
      { title: "Scale best practices", tags: ["process"], description: "Share what worked across teams." },
      { title: "Plan Q1 early", tags: ["planning"], description: "Build buffers for peak periods." },
      { title: "Sustain recognition rituals", tags: ["recognition"], description: "Capture team wins every month." },
    ],
    nudges: [
      { text: "Leave a quarterly buffer for peaks", tags: ["workload"] },
      { text: "Run a monthly recognition ritual", tags: ["recognition"] },
      { text: "Survey workload once per quarter", tags: ["workload", "survey"] },
    ],
  },
};

const buildDemoTimeseries = (): SurveyTimeseriesPointWithDate[] => {
  const rand = createSeededRandom(42);
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1, 12, 0, 0, 0);
  const end = new Date(year, 11, 31, 12, 0, 0, 0);
  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  const points: SurveyTimeseriesPointWithDate[] = [];

  for (let i = 0; i <= totalDays; i += 1) {
    const date = new Date(start.getTime() + i * DAY_MS);
    const seasonal = Math.sin(i / 18) * 0.6 + Math.cos(i / 6) * 0.3;
    const noise = (rand() - 0.5) * 0.35;
    let value = 7 + seasonal + noise;
    value = Math.min(8.7, Math.max(5.6, value));

    const prev = points[points.length - 1]?.value;
    if (typeof prev === "number" && Math.abs(value - prev) < 0.05) {
      value = Math.min(8.7, Math.max(5.6, prev + (rand() - 0.5) * 0.3));
    }

    points.push({
      label: date.toISOString().slice(0, 10),
      value: Number(value.toFixed(2)),
      date,
    });
  }

  return points;
};

const demoTimeseries = buildDemoTimeseries();

export default function LiveDemoSection({ locale = "en" }: { locale?: Locale }) {
  const isRu = locale === "ru";
  const [reportOpen, setReportOpen] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);
  const today = startOfDay(new Date());
  const [reportRange, setReportRange] = useState<{ from: string; to: string }>({
    from: formatDateValue(addDays(today, -6)),
    to: formatDateValue(today),
  });
  const reportOverrides = isRu ? demoReportOverridesRu : demoReportOverridesEn;

  const reportVariant = useMemo(() => {
    const start = new Date(reportRange.from);
    const end = new Date(reportRange.to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "month";
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
    if (days <= 14) return "week";
    if (days <= 90) return "month";
    return "year";
  }, [reportRange.from, reportRange.to]);

  const buildTrendPoints = (variant: "week" | "month" | "year", range: { from: string; to: string }) => {
    const localeCode = locale === "ru" ? "ru-RU" : "en-US";
    const values = demoTrendValues[variant];
    const start = new Date(range.from);
    const end = new Date(range.to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || values.length === 0) {
      return values.map((value, idx) => ({
        label: `W${idx + 1}`,
        value,
      }));
    }
    const span = Math.max(1, values.length - 1);
    const step = (end.getTime() - start.getTime()) / span;
    return values.map((value, idx) => {
      const date = new Date(start.getTime() + step * idx);
      return {
        label: date.toLocaleDateString(localeCode, { day: "numeric", month: "short" }),
        value,
        date,
      };
    });
  };

  const reportData = useMemo(() => {
    const range = reportRange;
    const trendPoints = buildTrendPoints(reportVariant, range);
    const base = generateAiEngagementReport(
      { from: range.from, to: range.to },
      trendPoints,
      locale
    );
    const override = reportOverrides[reportVariant];
    return {
      ...base,
      period: { from: range.from, to: range.to },
      trends: trendPoints,
      ...override,
    } as AiEngagementReport;
  }, [reportRange, reportVariant, locale, reportOverrides]);

  const openReport = (range?: { from: string; to: string }) => {
    if (range) setReportRange(range);
    setAutoDownload(false);
    setReportOpen(true);
  };

  const downloadReport = (range?: { from: string; to: string }) => {
    if (range) setReportRange(range);
    setAutoDownload(true);
    setReportOpen(true);
  };

  return (
    <section id="demo" className="bg-slate-50/70 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 lg:items-center">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live demo</p>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              {isRu ? "Посмотрите, как StressSense выглядит в работе" : "See how StressSense works live"}
            </h2>
            <p className="text-base text-slate-600">
              {isRu
                ? "Без регистрации: живой превью менеджерского cockpit и личного кабинета сотрудника с метриками стресса и действиями."
                : "No registration: live preview of the manager cockpit and the employee home with stress metrics and actions."}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isRu ? "Данные симулированы для примера" : "Simulated data for demo"}
            </p>
          </div>

        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Demo tables</p>
              <p className="text-sm text-slate-600">
                {isRu ? "Команды, стресс, вовлечённость и участие как в кабинете админа" : "Teams, stress, engagement, and participation like in the admin app"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadReport(reportRange)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {isRu ? "Скачать PDF" : "Download PDF"}
              </button>
            </div>
          </div>
          <div className="mt-5">
            <SurveyReport
              title={isRu ? "Отчёт по опросу" : "Survey report"}
              subtitle={isRu ? "Онлайн-просмотр" : "Online view"}
              score={7.1}
              delta={0.6}
              deltaDirection="up"
              periodLabel={isRu ? "Последние 6 месяцев" : "Last 6 months"}
              timeseries={demoTimeseries}
              drivers={
                isRu
                  ? [
                      { name: "Вовлечённость", score: 7.6, delta: 0.2 },
                      { name: "Признание", score: 7.2, delta: 0.1 },
                      { name: "Нагрузка", score: 3.0, delta: -0.3 },
                      { name: "Псих. безопасность", score: 7.9, delta: 0.4 },
                      { name: "Благополучие", score: 7.1, delta: -0.1 },
                    ]
                  : [
                      { name: "Engagement", score: 7.6, delta: 0.2 },
                      { name: "Recognition", score: 7.2, delta: 0.1 },
                      { name: "Workload", score: 3.0, delta: -0.3 },
                      { name: "Psych safety", score: 7.9, delta: 0.4 },
                      { name: "Wellbeing", score: 7.1, delta: -0.1 },
                    ]
              }
              ctaLabel={isRu ? "Проанализировать вовлечённость" : "Analyse engagement"}
              onCtaClick={(range) => openReport(range)}
              dateRange={reportRange}
              locale={isRu ? "ru" : "en"}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">{isRu ? "Команда" : "Team"}</th>
                  <th className="px-3 py-2 text-left">{isRu ? "Стресс" : "Stress"}</th>
                  <th className="px-3 py-2 text-left">{isRu ? "Вовлечённость" : "Engagement"}</th>
                  <th className="px-3 py-2 text-left">{isRu ? "Участие" : "Participation"}</th>
                  <th className="px-3 py-2 text-left">{isRu ? "Статус" : "Status"}</th>
                  <th className="px-3 py-2 text-left">{isRu ? "Действия" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demoTeams.map((team) => (
                  <tr key={team.name} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-semibold text-slate-900">{team.name}</td>
                    <td className="px-3 py-2">{team.stress.toFixed(1)}</td>
                    <td className="px-3 py-2">{team.engagement.toFixed(1)}</td>
                    <td className="px-3 py-2">{team.participation}%</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${
                          team.status === "At risk" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {team.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">AI insight</button>
                        <button className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">Action center</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AiEngagementReportPanel
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        report={reportData}
        locale={isRu ? "ru" : "en"}
        showPeriodRange={false}
        audience="manager"
        autoDownload={autoDownload}
        onAutoDownloadDone={() => setAutoDownload(false)}
      />
    </section>
  );
}
