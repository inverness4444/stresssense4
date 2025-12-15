"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TeamStatus,
  EmployeeStatus,
  teamStatusMeta,
  getTeamStatus,
  getTeamActionsByStatus,
  employeeStatusMeta,
  getEmployeeStatus,
  employeeQuestions,
  managerQuestions,
  tagAddons,
  InsightTag,
} from "./demoLogic";
import { EngagementTrendCard, TrendPoint } from "@/components/EngagementTrendCard";

type ViewMode = "manager" | "employee";
type ScenarioKey = "calm" | "pressure" | "launch";

type ChartPoint = { label: string; engagement: number; stress: number };
type ActionItem = { id: string; title: string; desc?: string; type: string; done: boolean };
type HabitItem = { id: string; title: string; done: boolean };

const SCENARIOS: Record<ScenarioKey, { label: string; engagement: number; stress: number; participation: number; chart: ChartPoint[] }> = {
  calm: {
    label: "Calm team",
    engagement: 8.4,
    stress: 3.1,
    participation: 92,
    chart: [
      { label: "W1", engagement: 7.6, stress: 4.0 },
      { label: "W2", engagement: 7.9, stress: 3.8 },
      { label: "W3", engagement: 8.1, stress: 3.5 },
      { label: "W4", engagement: 8.4, stress: 3.1 },
    ],
  },
  pressure: {
    label: "Under pressure",
    engagement: 6.5,
    stress: 6.9,
    participation: 74,
    chart: [
      { label: "W1", engagement: 7.0, stress: 5.5 },
      { label: "W2", engagement: 6.7, stress: 6.1 },
      { label: "W3", engagement: 6.3, stress: 6.5 },
      { label: "W4", engagement: 6.5, stress: 6.9 },
    ],
  },
  launch: {
    label: "Big launch week",
    engagement: 7.6,
    stress: 5.2,
    participation: 88,
    chart: [
      { label: "W1", engagement: 7.0, stress: 4.8 },
      { label: "W2", engagement: 7.2, stress: 5.0 },
      { label: "W3", engagement: 7.4, stress: 5.3 },
      { label: "W4", engagement: 7.6, stress: 5.2 },
    ],
  },
};

const MOODS = [
  { value: 5, label: "😌", text: "Спокойно" },
  { value: 4, label: "🙂", text: "Хорошо" },
  { value: 3, label: "😐", text: "Нормально" },
  { value: 2, label: "😣", text: "Сложно" },
  { value: 1, label: "😵", text: "Очень тяжело" },
];

const INITIAL_HABITS: HabitItem[] = [
  { id: "h1", title: "5-минутный перерыв каждые 90 минут", done: false },
  { id: "h2", title: "Короткое reflection в конце дня", done: false },
  { id: "h3", title: "20 минут движения", done: false },
  { id: "h4", title: "Без митингов 1 час", done: false },
];

function statusToneClasses(tone: string) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    primary: "bg-primary/10 text-primary ring-primary/20",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return map[tone] ?? map.slate;
}

function metricBadge(label: string, value: string, tone: string) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusToneClasses(tone)}`}>{value}</span>
    </div>
  );
}

function ActionList({
  actions,
  onToggle,
}: {
  actions: ActionItem[];
  onToggle: (id: string) => void;
}) {
  const completed = actions.filter((a) => a.done).length;
  return (
    <div className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Action center</p>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Интерактив</span>
      </div>
      <div className="mt-4 space-y-3">
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={() => onToggle(a.id)}
            className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition ${
              a.done ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50 hover:bg-slate-100"
            }`}
          >
            <span className={`mt-1 h-3 w-3 rounded-full ${a.done ? "bg-emerald-500" : "bg-primary"}`} />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{a.title}</p>
              {a.desc && <p className="text-xs text-slate-600">{a.desc}</p>}
              <p className="text-[11px] font-semibold text-primary">{a.done ? "Готово" : "Нажмите, чтобы завершить"}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-600">
        Выполнено: {completed}/{actions.length} задач
      </p>
    </div>
  );
}

function FollowUpBlock({
  question,
  selected,
  onSelect,
  openAnswer,
  onOpenChange,
}: {
  question: { question: string; options?: { label: string; tag: InsightTag }[]; open?: boolean } | null;
  selected?: InsightTag;
  onSelect: (tag: InsightTag) => void;
  openAnswer?: string;
  onOpenChange?: (val: string) => void;
}) {
  if (!question) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Вопрос от AI</p>
      <p className="mt-1 text-sm text-slate-600">{question.question}</p>
      {question.options && (
        <div className="mt-3 flex flex-wrap gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => onSelect(opt.tag)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selected === opt.tag ? "bg-primary text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {question.open && (
        <textarea
          value={openAnswer ?? ""}
          onChange={(e) => onOpenChange?.(e.target.value)}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
          placeholder="Напишите 1–2 фразы…"
        />
      )}
    </div>
  );
}

export default function LiveDemoPlayground() {
  const [mode, setMode] = useState<ViewMode>("manager");

  // Manager state
  const [scenario, setScenario] = useState<ScenarioKey>("pressure");
  const [engagement, setEngagement] = useState(SCENARIOS.pressure.engagement);
  const [stress, setStress] = useState(SCENARIOS.pressure.stress);
  const [participation, setParticipation] = useState(SCENARIOS.pressure.participation);
  const managerStatus = useMemo<TeamStatus>(() => getTeamStatus(stress, engagement, participation), [stress, engagement, participation]);
  const [managerDone, setManagerDone] = useState<Record<string, boolean>>({});
  const managerQuestion = managerQuestions[managerStatus];
  const [managerAnswerTag, setManagerAnswerTag] = useState<InsightTag | undefined>(undefined);
  const [managerOpenAnswer, setManagerOpenAnswer] = useState("");

  // Employee state
  const [mood, setMood] = useState<number>(4);
  const [wellbeing, setWellbeing] = useState<number>(7.4);
  const [habits, setHabits] = useState<HabitItem[]>(INITIAL_HABITS);
  const habitsCompletion = useMemo(() => Math.round((habits.filter((h) => h.done).length / habits.length) * 100), [habits]);
  const employeeStatus = useMemo<EmployeeStatus>(() => getEmployeeStatus(wellbeing, mood, habitsCompletion), [wellbeing, mood, habitsCompletion]);
  const employeeQuestion = employeeQuestions[employeeStatus];
  const [employeeAnswerTag, setEmployeeAnswerTag] = useState<InsightTag | undefined>(undefined);
  const [employeeOpenAnswer, setEmployeeOpenAnswer] = useState("");

  const managerActions = useMemo(() => getTeamActionsByStatus(managerStatus), [managerStatus]);
  const managerCompleted = managerActions.filter((a) => managerDone[a.id]).length;
  const managerAiText = useMemo(() => {
    const base = teamStatusMeta[managerStatus].ai;
    if (managerAnswerTag) {
      return `${base} ${tagAddons[managerAnswerTag]}`;
    }
    return base;
  }, [managerStatus, managerAnswerTag]);

  const employeeAiText = useMemo(() => {
    const base = employeeStatusMeta[employeeStatus].ai;
    if (employeeAnswerTag) {
      return `${base} ${tagAddons[employeeAnswerTag]}`;
    }
    return base;
  }, [employeeStatus, employeeAnswerTag]);

  const chartData: ChartPoint[] = useMemo(() => {
    const base = SCENARIOS[scenario].chart;
    return base.map((pt, idx, arr) => (idx === arr.length - 1 ? { label: pt.label, engagement, stress } : pt));
  }, [scenario, engagement, stress]);
  const engagementTrend: TrendPoint[] = chartData.map((pt) => ({ label: pt.label, value: pt.engagement }));
  const engagementDelta = engagementTrend.length > 1 ? engagementTrend[engagementTrend.length - 1].value - engagementTrend[0].value : 0;

  const employeeTrendBase: TrendPoint[] = useMemo(() => {
    const base: TrendPoint[] = [
      { label: "W1", value: 6.4 },
      { label: "W2", value: 6.6 },
      { label: "W3", value: 6.8 },
      { label: "W4", value: 7.0 },
      { label: "W5", value: 7.2 },
      { label: "W6", value: wellbeing },
    ];
    return base;
  }, [wellbeing]);
  const employeeDelta = employeeTrendBase[employeeTrendBase.length - 1].value - employeeTrendBase[0].value;

  const statusBadge = (status: TeamStatus | EmployeeStatus, tone: string, label: string) => (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusToneClasses(tone)}`}>{label}</span>
  );

  useEffect(() => {
    setEmployeeAnswerTag(undefined);
    setEmployeeOpenAnswer("");
  }, [employeeStatus]);

  return (
    <section id="live-demo" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">LIVE DEMO</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Поиграйте с cockpit прямо на странице</h2>
          <p className="mx-auto max-w-3xl text-slate-600">
            Manager и Employee режимы: двигайте метрики, отвечайте на умные вопросы и смотрите, как меняются советы и задачи. Данные симулированы, ничего не сохраняется.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {(
            [
              { key: "manager", label: "Manager view" },
              { key: "employee", label: "Employee view" },
            ] as { key: ViewMode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === tab.key ? "bg-primary text-white shadow" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
          {mode === "manager" ? (
            <div className="grid gap-6 lg:grid-cols-[0.42fr,0.58fr]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="rounded-full bg-slate-100 px-3 py-1">Сценарий</span>
                  {(
                    [
                      { key: "calm", label: "Calm team" },
                      { key: "pressure", label: "Under pressure" },
                      { key: "launch", label: "Big launch week" },
                    ] as { key: ScenarioKey; label: string }[]
                  ).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        setScenario(s.key);
                        setEngagement(SCENARIOS[s.key].engagement);
                        setStress(SCENARIOS[s.key].stress);
                        setParticipation(SCENARIOS[s.key].participation);
                        setManagerDone({});
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        scenario === s.key ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <MetricSlider label="Engagement" value={engagement} min={0} max={10} step={0.1} onChange={setEngagement} />
                  <MetricSlider label="Stress" value={stress} min={0} max={10} step={0.1} onChange={setStress} color="amber" />
                  <MetricSlider label="Participation" value={participation} min={0} max={100} step={1} onChange={setParticipation} color="emerald" suffix="%" />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {statusBadge(managerStatus, teamStatusMeta[managerStatus].tone, teamStatusMeta[managerStatus].badge)}
                      <p className="text-sm font-semibold text-slate-800">{teamStatusMeta[managerStatus].label}</p>
                    </div>
                    <p className="text-xs text-slate-500">{teamStatusMeta[managerStatus].summary}</p>
                  </div>
                  <p className="text-sm text-slate-700">
                    AI summary: <span className="font-semibold text-slate-900">{managerAiText}</span>
                  </p>
                </div>

                <FollowUpBlock
                  question={managerQuestion}
                  selected={managerAnswerTag}
                  openAnswer={managerOpenAnswer}
                  onOpenChange={setManagerOpenAnswer}
                  onSelect={(tag) => setManagerAnswerTag(tag)}
                />
                {managerAnswerTag && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-800">
                    AI реакция: {managerAiText}
                    <p className="mt-1 text-xs text-slate-600">
                      Часто называемые причины стресса: <span className="font-semibold text-slate-900">{managerAnswerTag}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <EngagementTrendCard
                  scope="team"
                  title="Team engagement & stress"
                  score={engagement}
                  delta={engagementDelta}
                  participation={participation}
                  trendLabel="за последние 4 спринта"
                  data={engagementTrend}
                />
                <div className="grid grid-cols-2 gap-3">
                  {metricBadge("Engagement", `${engagement.toFixed(1)}/10`, "primary")}
                  {metricBadge("Stress", `${stress.toFixed(1)}/10`, "amber")}
                  {metricBadge("Participation", `${participation.toFixed(0)}%`, "emerald")}
                  {metricBadge("Tasks done", `${managerCompleted}/${managerActions.length}`, "slate")}
                </div>

                <ActionList
                  actions={managerActions.map((a) => ({ ...a, done: managerDone[a.id] ?? false }))}
                  onToggle={(id) =>
                    setManagerDone((prev) => {
                      const next = { ...prev };
                      next[id] = !prev[id];
                      return next;
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[0.45fr,0.55fr]">
              <div className="space-y-4">
                <EmployeeWellbeingCard
                  status={employeeStatus}
                  statusMeta={employeeStatusMeta[employeeStatus]}
                  wellbeing={wellbeing}
                  mood={mood}
                  habitsCompletion={habitsCompletion}
                  onWellbeingChange={setWellbeing}
                  onMoodChange={(val) => setMood(val)}
                  habits={habits}
                  onToggleHabit={(id) => setHabits((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))}
                />

                <FollowUpBlock
                  question={employeeQuestion}
                  selected={employeeAnswerTag}
                  onSelect={(tag) => setEmployeeAnswerTag(tag)}
                  openAnswer={employeeOpenAnswer}
                  onOpenChange={setEmployeeOpenAnswer}
                />
                {employeeAnswerTag && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-800">
                    AI реакция: {employeeAiText}
                    <p className="mt-1 text-xs text-slate-600">
                      Сейчас: {employeeStatusMeta[employeeStatus].label} • Причина стресса: {employeeAnswerTag}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <EngagementTrendCard
                  scope="employee"
                  title="Мой тренд вовлечённости"
                  score={wellbeing}
                  delta={employeeDelta}
                  trendLabel="как менялась вовлечённость за 6 недель"
                  data={employeeTrendBase}
                />
                <div className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Итог</p>
                    {statusBadge(employeeStatus, employeeStatusMeta[employeeStatus].tone, employeeStatusMeta[employeeStatus].label)}
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    AI summary: <span className="font-semibold text-slate-900">{employeeAiText}</span>
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    {metricBadge("Wellbeing", `${wellbeing.toFixed(1)}/10`, "primary")}
                    {metricBadge("Mood", `${mood} / 5`, "amber")}
                    {metricBadge("Habits", `${habitsCompletion}%`, "emerald")}
                    {metricBadge("Status", employeeStatusMeta[employeeStatus].label, employeeStatusMeta[employeeStatus].tone)}
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Мини coach</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {employeeAiText}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Вопрос подбирается автоматически по вашему статусу. Ответ влияет на подсказки.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MetricSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  color,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color?: "amber" | "emerald";
  suffix?: string;
}) {
  const track =
    color === "amber"
      ? "accent-amber-500"
      : color === "emerald"
      ? "accent-emerald-500"
      : "accent-primary";
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
        <span>{label}</span>
        <span className="text-slate-600">
          {value.toFixed(1)}
          {suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 ${track}`}
      />
    </div>
  );
}

function EmployeeWellbeingCard({
  status,
  statusMeta,
  wellbeing,
  mood,
  habitsCompletion,
  onWellbeingChange,
  onMoodChange,
  habits,
  onToggleHabit,
}: {
  status: EmployeeStatus;
  statusMeta: { label: string; tone: string; ai: string };
  wellbeing: number;
  mood: number;
  habitsCompletion: number;
  onWellbeingChange: (v: number) => void;
  onMoodChange: (v: number) => void;
  habits: HabitItem[];
  onToggleHabit: (id: string) => void;
}) {
  const toneBg =
    status === "stable" ? "from-emerald-50 via-white to-emerald-100/60" : status === "tired" ? "from-amber-50 via-white to-amber-100/60" : "from-red-50 via-white to-rose-100/70";
  const moodLabel = MOODS.find((m) => m.value === mood)?.text ?? "";
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${toneBg} p-5 shadow-xl ring-1 ring-slate-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Моё состояние</p>
          <p className="text-xs text-slate-600">Баланс, настроение и привычки</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusToneClasses(statusMeta.tone)}`}>{statusMeta.label}</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Wellbeing</p>
          <div className="text-3xl font-bold text-slate-900">{wellbeing.toFixed(1)} / 10</div>
          <MetricSlider label="Настроить" value={wellbeing} min={0} max={10} step={0.1} onChange={onWellbeingChange} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Mood</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => onMoodChange(m.value)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                  mood === m.value ? "bg-primary text-white shadow" : "bg-white/70 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{m.label}</span>
                <span className="text-xs font-semibold">{m.text}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600">Текущее настроение: {moodLabel}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Привычки & streak</p>
          <p className="text-xs text-slate-600">
            Привычки выполнены: {habitsCompletion}% — {habitsCompletion >= 67 ? "сильная опора" : habitsCompletion >= 34 ? "неплохой ритм" : "почти нет опоры"}
          </p>
          <div className="mt-3 space-y-2">
            {habits.map((h) => (
              <button
                key={h.id}
                onClick={() => onToggleHabit(h.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                  h.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white hover:border-primary/40"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    h.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-500"
                  }`}
                >
                  ✓
                </span>
                <span className="text-sm font-semibold text-slate-900">{h.title}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-100">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
            <span>Микро-курс: «Стресс & фокус»</span>
            <span>{Math.min(100, habitsCompletion + 30)}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, habitsCompletion + 30)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-600">Завершайте маленькими шагами — по 10 минут</p>
        </div>
      </div>
    </div>
  );
}
