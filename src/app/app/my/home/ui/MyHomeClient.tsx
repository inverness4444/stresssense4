"use client";

import { useEffect, useState, useTransition } from "react";
import { EngagementTrendCard, type TrendPoint } from "@/components/EngagementTrendCard";
import { employeeStatusMeta, getEmployeeStatus } from "@/lib/statusLogic";
import type { EmployeeStatus } from "@/lib/statusLogic";
import {
  createPersonalActionItem,
  quickCreateHabitFromAiSuggestion,
  quickEnrollToSuggestedCourse,
  updatePersonalActionItemStatus,
} from "../../actions";
import type { Locale } from "@/lib/i18n";
import { StressSenseAiWidget } from "@/components/StressSenseAiWidget";
import { SurveyReport } from "@/components/app/SurveyReport";

type HomeData = Awaited<ReturnType<typeof import("../../actions").getMyHomeData>>;

export default function MyHomeClient({ data, userName, locale }: { data: HomeData; userName: string; locale: Locale }) {
  const [selectedTab, setSelectedTab] = useState<"focus" | "nudges">("focus");
  const [isPending, startTransition] = useTransition();
  const [personalNudges, setPersonalNudges] = useState<any[]>([]);
  const [loadingNudges, setLoadingNudges] = useState(false);
  const isRu = locale === "ru";
  const safeName = userName || "there";

  const wellbeing = data.personalStatus.engagement.score ?? 7.2;
  const moodValue = Math.round(data.personalStatus.mood.average ?? 4);
  const habitsTotal = data.habitsOverview.todayTasks.length;
  const habitsDone = data.habitsOverview.todayTasks.filter((t: any) => t.done).length;
  const habitsCompletion = habitsTotal > 0 ? (habitsDone / habitsTotal) * 100 : 0;
  const employeeStatus = getEmployeeStatus(wellbeing, moodValue, habitsCompletion);
  const statusMeta = employeeStatusMeta[employeeStatus];
  useEffect(() => {
    const load = async () => {
      setLoadingNudges(true);
      const res = await fetch("/app/api/nudges/personal");
      const json = await res.json();
      if (res.ok) {
        setPersonalNudges(json.nudges ?? []);
      }
      setLoadingNudges(false);
    };
    void load();
  }, []);
  const moodLabels: Record<number, { emoji: string; label: string }> = {
    1: { emoji: "😵", label: isRu ? "Очень тяжело" : "Rough" },
    2: { emoji: "😣", label: isRu ? "Сложный день" : "Hard day" },
    3: { emoji: "😐", label: isRu ? "Нормально" : "Okay" },
    4: { emoji: "🙂", label: isRu ? "Хорошо" : "Good" },
    5: { emoji: "😌", label: isRu ? "Спокойно" : "Calm" },
  };
  const habitsLabel =
    habitsCompletion >= 67
      ? isRu
        ? "Сильная опора"
        : "Strong habits"
      : habitsCompletion >= 34
        ? isRu
          ? "Неплохой ритм"
          : "Decent rhythm"
      : isRu
        ? "Почти нет опоры"
        : "Little habit support";

  const addPersonalNudge = (title: string, description?: string, tags?: string[]) => {
    startTransition(() => {
      void fetch("/app/api/nudges/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, tags }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.nudge) {
            setPersonalNudges((prev) => [json.nudge, ...prev]);
          }
        });
    });
  };

  const completePersonalNudge = (id: string) => {
    startTransition(() => {
      setPersonalNudges((prev) => prev.filter((n) => n.id !== id));
      void fetch("/app/api/nudges/personal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "done" }),
      });
    });
  };
  const trendDataSource = (data.personalStatus.engagement as any)?.timeseries ?? [];
  const trendData: TrendPoint[] = trendDataSource.map((p: any, idx: number) => ({
    label: p.date ? new Date(p.date).toLocaleDateString("ru-RU", { month: "short" }) : `W${idx + 1}`,
    value: (p as any).score ?? (p as any).value ?? wellbeing,
  }));
  if (trendData.length === 0) {
    trendData.push(
      { label: "W1", value: wellbeing - 0.4 },
      { label: "W2", value: wellbeing - 0.2 },
      { label: "W3", value: wellbeing },
      { label: "W4", value: wellbeing + 0.1 },
      { label: "W5", value: wellbeing - 0.1 },
      { label: "W6", value: wellbeing },
    );
  }
  const engagementDelta = wellbeing - (trendData[0]?.value ?? wellbeing);

  const status = data.personalStatus;
  const balanceScore =
    status.engagement.score && status.stress.score
      ? Math.max(0, Math.min(10, (status.engagement.score * 0.6 + (10 - status.stress.score) * 0.4)))
      : status.engagement.score ?? 0;

  useEffect(() => {
    setEmployeeAnswer("");
    setEmployeeAnswerTag(undefined);
  }, [employeeStatus]);

  const employeeQuestions: Record<
    EmployeeStatus,
    { question: string; options: Array<{ label: string; tag: string }> }
  > = {
    stable: {
      question: isRu ? "Что больше всего помогает держать баланс сейчас?" : "What helps you stay balanced now?",
      options: [
        { label: isRu ? "Понятные приоритеты" : "Clear priorities", tag: "clarity" },
        { label: isRu ? "Поддержка команды" : "Team support", tag: "recognition" },
        { label: isRu ? "Привычки и режим" : "Habits & routine", tag: "growth" },
        { label: isRu ? "Адекватные дедлайны" : "Reasonable deadlines", tag: "workload" },
        { label: isRu ? "Другое" : "Other", tag: "other" },
      ],
    },
    tired: {
      question: isRu ? "Что сильнее всего добавляет напряжения на этой неделе?" : "What adds the most tension this week?",
      options: [
        { label: isRu ? "Слишком много задач" : "Too many tasks", tag: "workload" },
        { label: isRu ? "Непонятные приоритеты" : "Unclear priorities", tag: "clarity" },
        { label: isRu ? "Много митингов" : "Too many meetings", tag: "meetings" },
        { label: isRu ? "Личные обстоятельства" : "Personal matters", tag: "personal" },
        { label: isRu ? "Другое" : "Other", tag: "other" },
      ],
    },
    burnoutRisk: {
      question: isRu ? "Что сейчас даёт больше всего стресса?" : "What causes the most stress right now?",
      options: [
        { label: isRu ? "Объём и сроки работы" : "Workload & deadlines", tag: "workload" },
        { label: isRu ? "Коммуникация и ожидания" : "Communication & expectations", tag: "clarity" },
        { label: isRu ? "Личные обстоятельства" : "Personal matters", tag: "personal" },
        { label: isRu ? "Не чувствую смысла" : "Lack of meaning", tag: "growth" },
        { label: isRu ? "Другое" : "Other", tag: "other" },
      ],
    },
  } as const;

  const [employeeAnswer, setEmployeeAnswer] = useState<string>("");
  const [employeeAnswerTag, setEmployeeAnswerTag] = useState<string | undefined>(undefined);

  const tagAdvice: Record<string, string> = {
    workload: isRu
      ? "Попробуйте на следующем 1:1 вместе выбрать 3 главные задачи — это снижает ощущение перегруза."
      : "In your next 1:1, pick the top 3 tasks together to ease overload.",
    meetings: isRu
      ? "Попросите один фокус-блок без митингов в день, чтобы разгрести важные задачи."
      : "Ask for a daily focus block without meetings to clear priorities.",
    clarity: isRu
      ? "Сформулируйте 3 главных результата недели и уточните ожидания с менеджером."
      : "Write three outcomes for the week and align on them with your manager.",
    recognition: isRu
      ? "Поделитесь, что поддержка команды помогает — это хороший сигнал признания."
      : "Share that team support helps — it's a good recognition signal.",
    growth: isRu
      ? "Выберите одну маленькую привычку или курс, который продвинет вас вперёд."
      : "Pick one small habit or course to move you forward.",
    personal: isRu
      ? "Можно временно снизить планку: выберите один небольшой шаг на 1–2 дня."
      : "Lower the bar for a bit: choose one small step for the next days.",
    other: isRu
      ? "Выберите один небольшой шаг на ближайшие 1–2 дня, который посилен."
      : "Pick one small, doable step for the next couple of days.",
  };

  return (
    <>
      <div className="space-y-6">
      {data.error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          We couldn&apos;t load everything just now. Please retry in a minute.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isRu ? "Моё благополучие" : "My wellbeing"}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isRu ? "Добрый день" : "Good day"}, {safeName.split(" ")[0] ?? "there"}!
          </h1>
          <p className="text-sm text-slate-600">
            {isRu ? "Ваш персональный кабинет стресса и привычек." : "Your personal stress & habit cockpit."}
          </p>
        </div>
        <div className="rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm">
          {isRu ? "Личный режим" : "Self view"}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <SurveyReport
          title={isRu ? "Мой стресс" : "My stress index"}
          subtitle={isRu ? "Последние недели" : "Recent weeks"}
          score={balanceScore || wellbeing || 0}
          delta={engagementDelta || 0}
          deltaDirection={engagementDelta >= 0 ? "up" : "down"}
          periodLabel={isRu ? "Последние 6 недель" : "Last 6 weeks"}
          timeseries={trendData}
          drivers={[
            { name: "Workload", score: status.stress.score ?? 6.5, delta: -0.1 },
            { name: "Recognition", score: 7.1, delta: 0.2 },
            { name: "Wellbeing", score: status.engagement.score ?? wellbeing ?? 7.0, delta: 0.1 },
          ]}
          ctaLabel={isRu ? "Посмотреть детали" : "See details"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={`rounded-3xl border border-slate-200 bg-gradient-to-br p-5 shadow-sm ${statusMeta.tone === "emerald" ? "from-emerald-50 to-white" : statusMeta.tone === "amber" ? "from-amber-50 to-white" : "from-rose-50 to-white"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isRu ? "Мой баланс" : "My balance"}
          </p>
          <div className="mt-3 flex items-start justify-between">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ring-1 ${statusMeta.tone === "emerald" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : statusMeta.tone === "amber" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
                {statusMeta.label}
              </div>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{statusMeta.ai}</h3>
              <p className="mt-2 text-sm text-slate-700">
                {isRu ? "Wellbeing" : "Wellbeing"}: {wellbeing.toFixed(1)} / 10
              </p>
              <p className="text-sm text-slate-700">
                {isRu ? "Mood" : "Mood"}: {moodLabels[moodValue]?.emoji} {moodLabels[moodValue]?.label}
              </p>
              <p className="text-sm text-slate-700">{isRu ? "Привычки" : "Habits"}: {habitsCompletion.toFixed(0)}% · {habitsLabel}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-900 shadow-sm ring-1 ring-slate-200">
              {balanceScore.toFixed(1)}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isRu ? "Привычки и прогресс" : "Habits & streaks"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{isRu ? "Выполнено сегодня" : "Completed today"}: {habitsCompletion.toFixed(0)}%</p>
          <p className="text-xs text-slate-500">{habitsLabel}</p>
          <div className="mt-3 space-y-2">
            {data.habitsOverview.todayTasks.slice(0, 4).map((t: any) => (
              <label key={t.task.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                <input type="checkbox" checked={t.done} readOnly className="h-4 w-4 rounded border-slate-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.task.title}</p>
                  <p className="text-xs text-slate-500 capitalize">{t.task.frequency}</p>
                </div>
              </label>
            ))}
            {data.habitsOverview.todayTasks.length === 0 && (
              <p className="text-sm text-slate-500">{isRu ? "Сегодня задач нет." : "No tasks today."}</p>
            )}
          </div>
          <button className="mt-3 text-sm font-semibold text-primary">
            {isRu ? "Все привычки" : "View all habits"}
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isRu ? "Обучение" : "Learning"}
          </p>
          {data.academyOverview.activeCourses[0] ? (
            <div className="mt-3 space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                {(data.academyOverview.activeCourses as any[])[0]?.course?.title ?? "Course"}
              </p>
              <p className="text-xs text-slate-500">
                {isRu ? "Прогресс" : "Progress"}: {(data.academyOverview.completionRate * 100).toFixed(0)}%
              </p>
              <button className="text-sm font-semibold text-primary">
                {isRu ? "Продолжить" : "Continue learning"}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              {isRu ? "Нет активных курсов." : "No active courses."}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <EngagementTrendCard
          scope="employee"
          title={isRu ? "Моя вовлечённость" : "My engagement trend"}
          score={wellbeing}
          delta={engagementDelta}
          trendLabel={isRu ? "как менялась вовлечённость за 6 недель" : "last 6 weeks"}
          data={trendData}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{isRu ? "Вопрос от AI" : "AI question"}</p>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {statusMeta.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">{employeeQuestions[employeeStatus].question}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {employeeQuestions[employeeStatus].options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  setEmployeeAnswer(opt.label);
                  setEmployeeAnswerTag(opt.tag);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  employeeAnswer === opt.label
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "bg-slate-50 text-slate-800 ring-1 ring-slate-200 hover:bg-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {employeeAnswer === "Other" || employeeAnswer === "Другое" ? (
            <textarea
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:border-primary/50 focus:ring-primary/30"
              placeholder={isRu ? "Добавьте свой вариант" : "Add your own"}
              onChange={(e) => setEmployeeAnswer(e.target.value)}
              value={employeeAnswer}
            />
          ) : null}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{isRu ? "AI-реакция" : "AI reaction"}</p>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {isRu ? "Моментально" : "Instant"}
            </span>
          </div>
          {employeeAnswer ? (
            <div className="mt-3 space-y-2 text-sm text-slate-800">
              <p>{statusMeta.ai}</p>
              <p className="text-slate-700">
                {employeeAnswerTag ? tagAdvice[employeeAnswerTag] : tagAdvice.other}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              {isRu ? "Выберите вариант, чтобы получить подсказку." : "Pick an option to see a suggestion."}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700 shadow-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
          {isRu ? "Статус" : "Status"}: {statusMeta.label}
        </span>
        {employeeAnswerTag && (
          <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            {isRu ? "Причина" : "Reason"}: {employeeAnswer}
          </span>
        )}
        {!employeeAnswerTag && (
          <span className="text-xs text-slate-500">{isRu ? "Ответьте на вопрос, чтобы зафиксировать причину." : "Answer the question to capture a cause."}</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{isRu ? "Мои 1:1" : "My 1:1s"}</p>
          <div className="mt-3 space-y-2">
            {data.oneOnOnes.upcomingMeetings.map((m: any) => (
              <div key={m.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-900">
                  {isRu ? "Встреча" : "Meeting"} · {new Date(m.scheduledAt).toLocaleDateString()}
                </p>
              </div>
            ))}
            {data.oneOnOnes.upcomingMeetings.length === 0 && (
              <p className="text-sm text-slate-500">{isRu ? "Нет запланированных встреч" : "No upcoming meetings"}</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{isRu ? "Мои цели" : "My goals"}</p>
          <div className="mt-3 space-y-2">
            {data.goals.activeGoals.map((g: any) => (
              <div key={g.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-900">{g.title}</p>
                <p className="text-xs text-slate-500">
                  {isRu ? "Прогресс" : "Progress"}: {(g.progress * 100).toFixed(0)}%
                </p>
              </div>
            ))}
            {data.goals.activeGoals.length === 0 && (
              <p className="text-sm text-slate-500">{isRu ? "Нет целей" : "No goals yet"}</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{isRu ? "Признание" : "Recognition"}</p>
          <div className="mt-3 space-y-2">
            {data.nudges.slice(0, 2).map((n: any) => (
              <div key={n.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-900">{n.title}</p>
                {n.description && <p className="text-xs text-slate-600">{n.description}</p>}
              </div>
            ))}
            {data.nudges.length === 0 && <p className="text-sm text-slate-500">{isRu ? "Пусто" : "Empty"}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{isRu ? "Мои приоритеты" : "My focus"}</p>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => { void createPersonalActionItem({ title: "New personal task" }); })}
              className="text-sm font-semibold text-primary disabled:opacity-50"
            >
              {isRu ? "Добавить задачу" : "Add task"}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {data.personalActionItems.length === 0 && (
              <p className="text-sm text-slate-500">{isRu ? "Нет открытых задач." : "No open tasks."}</p>
            )}
            {data.personalActionItems.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500 capitalize">{a.type}</p>
                </div>
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => { void updatePersonalActionItemStatus(a.id, "done"); })}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                >
                  {isRu ? "Готово" : "Done"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {isRu ? "Подсказки и сообщения" : "Nudges & messages"}
            </p>
            <span className="text-xs text-slate-500">{isRu ? "Последние" : "Latest"}</span>
          </div>
          <div className="mt-3 space-y-2">
            {data.nudges.length === 0 && (
              <p className="text-sm text-slate-500">{isRu ? "Подсказок пока нет." : "No nudges yet."}</p>
            )}
            {data.nudges.map((n: any) => (
              <div key={n.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                {n.description && <p className="text-xs text-slate-600 mt-1">{n.description}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{isRu ? "Мои шаги" : "My steps"}</p>
            <p className="text-xs text-slate-500">{isRu ? "Личные небольшие действия из AI-коуча" : "Small personal nudges from the coach"}</p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={isPending}
              onClick={() => addPersonalNudge(isRu ? "10-минутная прогулка" : "10-minute walk", isRu ? "Короткая прогулка без экрана" : "Short walk off-screen", ["wellbeing"])}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary disabled:opacity-50"
            >
              {isRu ? "Добавить прогулку" : "Add walk"}
            </button>
            <button
              disabled={isPending}
              onClick={() => addPersonalNudge(isRu ? "Фокус-блок 25 минут" : "25 min focus block", isRu ? "Выключите уведомления и закройте почту" : "Mute notifications and pick one task", ["focus"])}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 disabled:opacity-50"
            >
              {isRu ? "Фокус-блок" : "Focus"}
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {loadingNudges && <p className="text-sm text-slate-500">{isRu ? "Загружаем..." : "Loading..."}</p>}
          {!loadingNudges && personalNudges.length === 0 && <p className="text-sm text-slate-500">{isRu ? "Пока нет персональных шагов." : "No personal steps yet."}</p>}
          {personalNudges.map((n) => (
            <label key={n.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
              <input type="checkbox" className="mt-1" onChange={() => completePersonalNudge(n.id)} />
              <div>
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                {n.description && <p className="text-xs text-slate-600">{n.description}</p>}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">
            {isRu ? "AI взгляд на ваш месяц" : "AI view of your month"}
          </p>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {isRu ? "Сгенерировано AI" : "AI generated"}
          </span>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {isRu ? "Кратко" : "Summary"}
            </p>
            <p className="mt-2 text-sm text-slate-700">{data.aiLens.summary}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {isRu ? "Сильные стороны" : "Strengths"}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-emerald-700">
              {data.aiLens.strengths.map((r: string) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mt-4">
              {isRu ? "Риски" : "Risks"}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-rose-700">
              {data.aiLens.risks.map((r: string) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {isRu ? "Рекомендованные привычки" : "Suggested habits"}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {data.aiLens.suggestedHabits.map((r: string) => (
                <li key={r} className="flex items-center justify-between gap-2">
                  <span>• {r}</span>
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => { void quickCreateHabitFromAiSuggestion(r); })}
                    className="text-xs font-semibold text-primary underline underline-offset-4 disabled:opacity-50"
                  >
                    {isRu ? "Добавить" : "Add"}
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mt-4">
              {isRu ? "Рекомендованные курсы" : "Suggested courses"}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {data.aiLens.suggestedCourses.map((r: string) => (
                <li key={r} className="flex items-center justify-between gap-2">
                  <span>• {r}</span>
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => { void quickEnrollToSuggestedCourse(r); })}
                    className="text-xs font-semibold text-primary underline underline-offset-4 disabled:opacity-50"
                  >
                    {isRu ? "Записаться" : "Enroll"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">{isRu ? "Быстрые действия" : "Quick actions"}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
            {isRu ? "Поговорить с коучем" : "Talk to coach"}
          </button>
          <button className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
            {isRu ? "Быстрый чек-ин" : "Take a quick check-in"}
          </button>
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
            {isRu ? "Поделиться отзывом для HR" : "Share feedback with HR"}
          </button>
        </div>
      </div>
    </div>
      <StressSenseAiWidget mode="employee" employeeMetrics={{
        stress: status.stress?.score ?? 6.2,
        wellbeing,
        mood: moodValue,
        habitsCompletion,
        tags: (data.personalStatus as any)?.tags ?? [],
      }} />
    </>
  );
}
