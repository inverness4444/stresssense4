"use client";

import { useMemo, useState } from "react";

const SCENARIOS = {
  calm: {
    key: "calm",
    name: "Спокойная команда",
    engagement: 8.3,
    stress: 3.2,
    participation: 92,
    chart: [7.5, 7.8, 8.0, 8.1, 8.3, 8.4, 8.3, 8.2],
    actions: [
      { title: "Продлить признание", desc: "Отправьте thank-you nudge за спринт" },
      { title: "План 1:1", desc: "Обновите вопросы к еженедельным 1:1" },
      { title: "Проверить цели", desc: "Goal check-in по Q2" },
    ],
  },
  pressure: {
    key: "pressure",
    name: "Высокая нагрузка",
    engagement: 6.9,
    stress: 7.4,
    participation: 78,
    chart: [7.2, 7.1, 6.9, 6.8, 6.7, 6.9, 6.6, 6.5],
    actions: [
      { title: "Pulse survey", desc: "Запустите быстрый опрос о нагрузке" },
      { title: "Ретро", desc: "Назначьте 30-мин ретроспективу по проекту" },
      { title: "1:1 с рисковыми", desc: "Точечные чек-ины с перегруженными" },
    ],
  },
  launch: {
    key: "launch",
    name: "Запуск продукта",
    engagement: 7.7,
    stress: 6.1,
    participation: 88,
    chart: [7.0, 7.2, 7.4, 7.6, 7.8, 7.9, 8.0, 7.7],
    actions: [
      { title: "Коммуникация", desc: "Расшарьте фокус на неделю и приоритеты" },
      { title: "Recognition", desc: "Похвалите команду за ночной релиз" },
      { title: "Восстановление", desc: "Запланируйте день без встреч" },
    ],
  },
};

const moodOptions = [
  { key: "great", label: "😌", text: "Энергия есть" },
  { key: "ok", label: "🙂", text: "Нормально" },
  { key: "neutral", label: "😐", text: "Нейтрально" },
  { key: "tired", label: "😣", text: "Устал" },
  { key: "low", label: "😵", text: "Перегруз" },
];

const habitTemplates = [
  "5-мин перерыв каждые 90 минут",
  "Завершить день коротким рефлексом",
  "20 минут движения",
  "Проверить приоритеты дня",
];

type ScenarioKey = keyof typeof SCENARIOS;

function getBadgeColor(val: number, inverse = false) {
  const score = inverse ? 10 - val : val;
  if (score >= 7.5) return "bg-emerald-100 text-emerald-700";
  if (score >= 5.5) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function buildAISummary(engagement: number, stress: number, participation: number) {
  if (stress > 7) {
    return {
      summary: "Стресс высок: сфокусируйтесь на приоритизации и поддержке. Участие падает, нужен быстрый опрос и 1:1.",
      suggestions: ["Запустить pulse survey", "Назначить ретро и снять блокеры", "Дать признание за последние усилия"],
    };
  }
  if (engagement >= 8 && stress <= 4) {
    return {
      summary: "Команда стабильна и вовлечена. Поддержите темп лёгкими nudges и регулярными check-in.",
      suggestions: ["Поделиться признанием", "Удерживать cadence 1:1", "Планировать обучение по интересу"],
    };
  }
  return {
    summary: "Баланс держится, но следите за сигналами. Чередуйте нагрузку и микропаузы, поддерживайте прозрачность.",
    suggestions: ["Попросить фидбэк", "Напомнить о перерывах", "Пройти короткий wellbeing-опрос"],
  };
}

function getCoachCopy(mood: string, habitsDone: number, totalHabits: number) {
  if (mood === "great" && habitsDone >= totalHabits - 1) {
    return "Отличный темп! Сохраните границы дня и заверши́те его коротким рефлексом.";
  }
  if (mood === "tired" || mood === "low") {
    return "Сделайте паузу, подышите 2 минуты, сократите задачи до 3 главных. Попросите поддержку, если нужно.";
  }
  if (habitsDone === 0) {
    return "Начните с маленького: выберите 1 привычку и выполните её прямо сейчас, чтобы сдвинуть день.";
  }
  return "Держите фокус на восстановлении и ясных приоритетах. Маленькие шаги дадут спокойствие.";
}

export default function LiveDemoPlayground() {
  const [view, setView] = useState<"manager" | "employee">("manager");
  const [scenario, setScenario] = useState<ScenarioKey>("calm");
  const base = SCENARIOS[scenario];
  const [engagement, setEngagement] = useState(base.engagement);
  const [stress, setStress] = useState(base.stress);
  const [participation, setParticipation] = useState(base.participation);

  const [mood, setMood] = useState(moodOptions[1].key);
  const [habits, setHabits] = useState(
    habitTemplates.map((title, idx) => ({ id: `h${idx}`, title, done: idx < 2 }))
  );

  const habitsDone = habits.filter((h) => h.done).length;
  const wellbeing = useMemo(() => {
    const moodScore = (() => {
      switch (mood) {
        case "great":
          return 1.2;
        case "ok":
          return 0.6;
        case "neutral":
          return 0;
        case "tired":
          return -0.8;
        default:
          return -1.2;
      }
    })();
    const habitScore = (habitsDone / habits.length) * 2;
    return Math.max(0, Math.min(10, 7.2 + moodScore + habitScore));
  }, [mood, habitsDone, habits.length]);

  const { summary: aiSummary, suggestions: aiSuggestions } = useMemo(
    () => buildAISummary(engagement, stress, participation),
    [engagement, stress, participation]
  );

  const managerChart = useMemo(() => {
    const scale = engagement / base.engagement;
    return base.chart.map((v) => Number((v * scale).toFixed(2)));
  }, [base.chart, base.engagement, engagement]);

  return (
    <section className="relative py-12 sm:py-16">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-indigo-50/40 to-emerald-50/30" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Playground</p>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Менеджер и сотрудник в интерактивном демо</h2>
            <p className="mt-2 text-sm text-slate-600">Все данные фейковые. Крутите ползунки, отмечайте привычки и смотрите, как меняются карточки.</p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-full bg-white/60 p-1 shadow-sm ring-1 ring-slate-200">
            {[{ key: "manager", label: "Manager view" }, { key: "employee", label: "Employee view" }].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key as "manager" | "employee")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  view === tab.key ? "bg-primary text-white shadow" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {view === "manager" ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4 rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(Object.values(SCENARIOS) as typeof SCENARIOS[ScenarioKey][]).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        setScenario(s.key as ScenarioKey);
                        setEngagement(s.engagement);
                        setStress(s.stress);
                        setParticipation(s.participation);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        scenario === s.key ? "bg-primary text-white shadow" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Демо-данные</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard label="Engagement" value={`${engagement.toFixed(1)}/10`} badgeClass={getBadgeColor(engagement)} />
                <MetricCard label="Stress" value={`${stress.toFixed(1)}/10`} badgeClass={getBadgeColor(stress, true)} />
                <MetricCard label="Participation" value={`${participation.toFixed(0)}%`} badgeClass={getBadgeColor(participation / 10)} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SliderBlock label="Engagement" value={engagement} min={4} max={10} step={0.1} onChange={setEngagement} />
                <SliderBlock label="Stress" value={stress} min={1} max={10} step={0.1} onChange={setStress} />
                <SliderBlock label="Participation" value={participation} min={40} max={100} step={1} onChange={setParticipation} suffix="%" />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Trends</p>
                  <MiniLineChart data={managerChart} />
                  <p className="mt-2 text-xs text-slate-600">Небольшой график с динамикой engagement/stress по сценарию.</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">AI lens (demo)</p>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">No backend</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{aiSummary}</p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600">
                    {aiSuggestions.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Action center</p>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">Interactive</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {base.actions.map((action) => (
                    <div key={action.title} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                        <p className="text-xs text-slate-600">{action.desc}</p>
                        <button className="text-[11px] font-semibold text-primary hover:underline">Отметить выполненным</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">Настройте сценарий</p>
              <p className="text-sm text-slate-700">Смена режима и ползунков моментально меняет карточки слева.</p>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-100">
                <p className="font-semibold text-slate-900">Что попробовать:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>Переключите «Высокая нагрузка» и посмотрите AI-summary.</li>
                  <li>Сдвиньте стресс ниже 4 — заметите зелёные бейджи.</li>
                  <li>Поиграйте с participation — это влияет на Action center.</li>
                </ul>
                <p className="mt-3 text-[11px] text-slate-500">Демо автономно, данные нигде не сохраняются.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4 rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Employee demo</p>
                  <h3 className="text-xl font-semibold text-slate-900">Мой wellbeing и привычки</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Demo only</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">My wellbeing</p>
                  <p className="text-2xl font-bold text-slate-900">{wellbeing.toFixed(1)} / 10</p>
                  <p className="text-xs text-slate-600">Основано на настроении и привычках демо</p>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${Math.min(100, wellbeing * 10)}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {moodOptions.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMood(m.key)}
                        className={`rounded-full px-3 py-2 text-base transition ${
                          mood === m.key ? "bg-primary text-white shadow" : "bg-white text-slate-700 ring-1 ring-slate-200"
                        }`}
                        aria-label={m.text}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Habits & streaks</p>
                  <p className="text-xs text-slate-600">Отметьте, что сделали сегодня</p>
                  <div className="mt-3 space-y-2">
                    {habits.map((habit) => (
                      <button
                        key={habit.id}
                        onClick={() =>
                          setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, done: !h.done } : h)))
                        }
                        className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                          habit.done ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50 ring-1 ring-transparent hover:ring-slate-200"
                        }`}
                      >
                        <span className={`mt-1 h-3 w-3 rounded-full ${habit.done ? "bg-emerald-500" : "bg-primary"}`} />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{habit.title}</p>
                          <p className="text-[11px] text-slate-600">{habit.done ? "Выполнено" : "Нажмите, чтобы отметить"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-600">
                    {habitsDone}/{habits.length} привычек за сегодня · {habitsDone === habits.length ? "Отличная серия!" : "Есть что добрать"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Coach говорит</p>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">Demo AI</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{getCoachCopy(mood, habitsDone, habits.length)}</p>
                <p className="mt-2 text-[11px] text-slate-500">Это демо, данные не сохраняются и не отправляются в бэкенд.</p>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">Попробуйте разные состояния</p>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-100">
                <ul className="list-disc space-y-2 pl-5">
                  <li>Поставьте настроение 😣 или 😵 и отметьте 1–2 привычки — увидите, как меняется wellbeing.</li>
                  <li>Отметьте все привычки — получите поддерживающее сообщение.</li>
                  <li>С мобильного тоже удобно: большие кнопки и чекбоксы.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-600">
                В реальном продукте здесь ещё обучение (Academy), чек-листы онбординга и персональные nudges. В демо — только минимальный
                слой, чтобы поиграться.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

type MetricCardProps = { label: string; value: string; badgeClass: string };

function MetricCard({ label, value, badgeClass }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <span className={`mt-2 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
        Live
      </span>
    </div>
  );
}

type SliderBlockProps = { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string };

function SliderBlock({ label, value, min, max, step, onChange, suffix }: SliderBlockProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
        <span>{label}</span>
        <span className="text-slate-700">
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
        className="mt-3 w-full accent-primary"
      />
    </div>
  );
}

type MiniLineChartProps = { data: number[] };

function MiniLineChart({ data }: MiniLineChartProps) {
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;
  const points = data
    .map((v, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = 100 - ((v - minVal) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mt-4 h-36 rounded-xl bg-white/70 p-3 ring-1 ring-slate-100">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(129 140 248)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="url(#chartGradient)" strokeWidth="2.5" points={points} />
        <polygon fill="url(#chartGradient)" opacity="0.25" points={`0,100 ${points} 100,100`} />
      </svg>
    </div>
  );
}
