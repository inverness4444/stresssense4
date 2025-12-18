"use client";

import { useMemo, useState } from "react";
import { SurveyReport } from "@/components/app/SurveyReport";

type DemoScenario = {
  key: string;
  name: string;
  engagement: number;
  engagementDelta: number;
  stressLabel: string;
  stressBar: number;
  stressHint: string;
  wellbeing: number;
  mood: string;
  habits: number;
  aiTip: string;
  actions: string[];
};

const demoTeams = [
  { name: "Product", stress: 7.2, engagement: 7.8, participation: 82, status: "Watch" },
  { name: "Marketing", stress: 8.1, engagement: 6.5, participation: 71, status: "At risk" },
  { name: "Ops", stress: 6.4, engagement: 7.1, participation: 76, status: "Watch" },
];
const monthMs = 30 * 24 * 60 * 60 * 1000;
const demoTimeseries = [
  { label: "Mar", value: 6.8, date: new Date(Date.now() - 5 * monthMs) },
  { label: "Apr", value: 7.0, date: new Date(Date.now() - 4 * monthMs) },
  { label: "May", value: 7.1, date: new Date(Date.now() - 3 * monthMs) },
  { label: "Jun", value: 7.4, date: new Date(Date.now() - 2 * monthMs) },
  { label: "Jul", value: 7.3, date: new Date(Date.now() - 1 * monthMs) },
  { label: "Aug", value: 7.6, date: new Date() },
];

export default function LiveDemoSection() {
  const isRu = useMemo(
    () => (typeof document !== "undefined" ? (document.documentElement.lang || "").toLowerCase().startsWith("ru") : true),
    []
  );
  const scenarios: DemoScenario[] = isRu
    ? [
        {
          key: "calm",
          name: "Спокойный спринт",
          engagement: 8.4,
          engagementDelta: 0.6,
          stressLabel: "Watch",
          stressBar: 60,
          stressHint: "Нагрузка и дедлайны",
          wellbeing: 7.2,
          mood: "🙂 Хорошо",
          habits: 60,
          aiTip: "Добавьте фокус-блок 25 минут",
          actions: ["Провести ревизию митингов", "Уточнить приоритеты спринта", "Закрепить признание"],
        },
        {
          key: "pressure",
          name: "Под давлением",
          engagement: 6.8,
          engagementDelta: -0.4,
          stressLabel: "At risk",
          stressBar: 82,
          stressHint: "Перегруз и мало ясности",
          wellbeing: 6.2,
          mood: "😟 Напряжённо",
          habits: 30,
          aiTip: "Сместите сроки и назначьте 1:1 с перегруженными",
          actions: ["Назначить 1:1 с перегруженными", "Сократить количество митингов", "Разложить задачи по приоритету"],
        },
      ]
    : [
        {
          key: "calm",
          name: "Calm sprint",
          engagement: 8.4,
          engagementDelta: 0.6,
          stressLabel: "Watch",
          stressBar: 60,
          stressHint: "Workload and deadlines",
          wellbeing: 7.2,
          mood: "🙂 Good",
          habits: 60,
          aiTip: "Add a 25-minute focus block",
          actions: ["Run a meeting cleanup", "Clarify sprint priorities", "Reinforce recognition"],
        },
        {
          key: "pressure",
          name: "Under pressure",
          engagement: 6.8,
          engagementDelta: -0.4,
          stressLabel: "At risk",
          stressBar: 82,
          stressHint: "Overload and low clarity",
          wellbeing: 6.2,
          mood: "😟 Tense",
          habits: 30,
          aiTip: "Shift deadlines and schedule 1:1s with overloaded people",
          actions: ["Schedule 1:1s with overloaded", "Trim the meeting load", "Prioritize tasks clearly"],
        },
      ];
  const [scenario, setScenario] = useState<DemoScenario>(scenarios[0]);

  return (
    <section id="demo" className="bg-slate-50/70 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
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
            <div className="flex flex-wrap gap-2">
              {scenarios.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setScenario(s)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                    scenario.key === s.key ? "bg-primary text-white shadow-sm" : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full">
            <div className="absolute -left-4 top-6 h-20 w-20 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-0 top-10 h-20 w-20 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="relative space-y-4 overflow-hidden rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live preview</p>
                  <p className="text-lg font-semibold text-slate-900">{isRu ? "Обзор стресса и вовлечённости" : "Stress & Engagement overview"}</p>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Demo</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Engagement score</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{scenario.engagement.toFixed(1)}</p>
                  <p className={`text-xs font-semibold ${scenario.engagementDelta >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                    {scenario.engagementDelta >= 0 ? "↑" : "↓"}
                    {isRu ? `${Math.abs(scenario.engagementDelta).toFixed(1)} pt за 6 мес` : `${Math.abs(scenario.engagementDelta).toFixed(1)} pt over 6 mo`}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary"
                      style={{ width: `${scenario.engagement * 10}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Stress risk</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{scenario.stressLabel}</p>
                  <p className="text-xs text-amber-600">{scenario.stressHint}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${scenario.stressBar}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Action center</p>
                  <ul className="mt-2 space-y-2 text-xs text-slate-700">
                    {scenario.actions.map((a, idx) => (
                      <li key={a} className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-amber-500" : "bg-primary"
                          }`}
                        />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Employee home</p>
                  <p className="mt-2 text-sm text-slate-800">
                    {isRu ? "Wellbeing, привычки и AI-коуч в одном месте." : "Wellbeing, habits, and AI coach in one place."}
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p>
                      Wellbeing: {scenario.wellbeing.toFixed(1)} · {isRu ? "Настроение" : "Mood"}: {scenario.mood}
                    </p>
                    <p>{isRu ? "Привычки выполнены" : "Habits complete"}: {scenario.habits}%</p>
                    <p>{isRu ? "Совет AI" : "AI tip"}: {scenario.aiTip}</p>
                  </div>
                </div>
              </div>
            </div>
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
    </section>
  );
}
