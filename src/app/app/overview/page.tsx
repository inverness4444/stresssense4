import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SurveyReportWithAiPanel } from "@/components/app/SurveyReportWithAiPanel";
import { getLocale } from "@/lib/i18n-server";
import { initialActions, type ActionItem } from "@/lib/actionCenterMocks";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Позволяем всем ролям видеть обзор, как в старой версии
  const locale = await getLocale();
  const isRu = locale === "ru";
  const isDemo = Boolean((user as any)?.organization?.isDemo);
  const createdAt = (user as any)?.organization?.createdAt ? new Date((user as any).organization.createdAt) : new Date();
  const diffDays = Math.max(0, Math.ceil((7 * 24 * 60 * 60 * 1000 - (Date.now() - createdAt.getTime())) / (24 * 60 * 60 * 1000)));
  const gateAdvanced = !isDemo && diffDays > 0;

  const teams = await prisma.team.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" } });
  const runs = (await prisma.surveyRun.findMany({ where: { orgId: user.organizationId }, orderBy: { launchedAt: "desc" }, take: 5 })) ?? [];
  const nudges = await prisma.nudgeInstance.findMany({
    where: { orgId: user.organizationId, status: { in: ["todo", "planned"] } },
    include: { template: true, team: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const sampleTeams: any[] = [
    { id: "sample-1", name: "Product", stressIndex: 7.0, engagementScore: 7.2, participation: 80, status: "Watch" },
    { id: "sample-2", name: "Marketing", stressIndex: 7.0, engagementScore: 7.0, participation: 80, status: "UnderPressure" },
  ];
  const safeTeams = isDemo ? (teams.length ? teams : sampleTeams) : teams;
  const safeRuns =
    isDemo && runs.length === 0
      ? [{ id: "sample-run", title: "Stress & Engagement pulse", launchedAt: new Date(), avgStressIndex: 6.5, avgEngagementScore: 7.1 }]
      : runs;
  const safeNudges =
    isDemo && (nudges ?? []).length === 0
      ? [
          {
            id: "sample-nudge-1",
            template: { title: "Провести ревизию митингов", description: "Сократите повторяющиеся встречи и освободите фокус.", triggerTags: ["meetings"] },
            status: "todo",
            team: { name: "Product" },
            tags: ["meetings"],
          },
          {
            id: "sample-nudge-2",
            template: { title: "Перераспределить задачи", description: "Сдвиньте задачи, чтобы снизить нагрузку.", triggerTags: ["workload", "clarity"] },
            status: "planned",
            team: { name: "Marketing" },
            tags: ["workload", "clarity"],
          },
        ]
      : nudges;

  const hasTeams = safeTeams.length > 0;
  const hasRuns = safeRuns.length > 0;

  const avgStressRaw = hasTeams ? safeTeams.reduce((acc: number, t: any) => acc + (t.stressIndex ?? 0), 0) / safeTeams.length : 0;
  const avgEngagementRaw = hasTeams ? safeTeams.reduce((acc: number, t: any) => acc + (t.engagementScore ?? 0), 0) / safeTeams.length : 0;
  const participationRaw = hasTeams ? Math.round(safeTeams.reduce((acc: number, t: any) => acc + (t.participation ?? 0), 0) / safeTeams.length) : 0;
  const avgStress = avgStressRaw;
  const avgEngagement = avgEngagementRaw;
  const participation = participationRaw;
  const activeSurveys = runs.length;

  const engagementScore = safeRuns.length && safeRuns[0].avgEngagementScore ? safeRuns[0].avgEngagementScore : 0;

  const reportTimeseries =
    safeRuns.length > 1
      ? safeRuns.map((run: any, idx: number) => ({
          label: run.launchedAt ? new Date(run.launchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `W${idx + 1}`,
          value: run.avgEngagementScore ?? engagementScore,
          date: run.launchedAt ?? null,
        }))
      : [];

  const driverCards = hasTeams
    ? [
        { name: isRu ? "Вовлечённость" : "Alignment", score: Math.max(0, avgEngagementRaw), delta: 0 },
        { name: isRu ? "Нагрузка" : "Workload", score: Math.max(0, avgStressRaw), delta: 0 },
      ]
    : [];
  const watchThreshold = 7.5;
  const firstDate = reportTimeseries[0]?.date ? new Date(reportTimeseries[0].date) : new Date();
  const lastDate = reportTimeseries[reportTimeseries.length - 1]?.date ? new Date(reportTimeseries[reportTimeseries.length - 1].date) : new Date();
  const periodFrom = firstDate.toISOString().slice(0, 10);
  const periodTo = lastDate.toISOString().slice(0, 10);

  const computeWeekdayStreak = (dates: (Date | null | undefined)[]) => {
    const daySet = new Set(
      dates
        .filter((d): d is Date => !!d)
        .map((d) => {
          const local = new Date(d);
          local.setHours(0, 0, 0, 0);
          return local.toISOString().slice(0, 10);
        })
    );
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (true) {
      const day = cursor.getDay();
      if (day === 0 || day === 6) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      const iso = cursor.toISOString().slice(0, 10);
      if (daySet.has(iso)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    return streak;
  };

  const streak = computeWeekdayStreak(reportTimeseries.map((p) => (p as any).date ? new Date((p as any).date) : null));
  const focusActions = isDemo ? (initialActions.filter((a) => a.status !== "done").slice(0, 3) as ActionItem[]) : [];
  const dueLabel = (days: number) => {
    if (days < 0) return isRu ? `Просрочено на ${Math.abs(days)} дн.` : `Overdue by ${Math.abs(days)} days`;
    if (days === 0) return isRu ? "Срок сегодня" : "Due today";
    return isRu ? `До срока: ${days} дн.` : `Due in ${days} days`;
  };

  if (!isDemo && !hasTeams && !hasRuns) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
            <h1 className="text-2xl font-semibold text-slate-900">{isRu ? "Обзор" : "Overview"}</h1>
            <p className="text-sm text-slate-600">
              {isRu ? "Данных ещё нет — запустите первый опрос и добавьте команды." : "No data yet — launch your first survey and add teams."}
            </p>
          </div>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-base font-semibold text-slate-900">
            {isRu ? "Начните с первого действия" : "Start with your first step"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {isRu ? "Добавьте команду и запустите короткий опрос, чтобы увидеть метрики стресса и вовлечённости." : "Add a team and launch a quick pulse to see stress and engagement metrics."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/app/surveys/new" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105">
              {isRu ? "Запустить опрос" : "Launch survey"}
            </Link>
            <Link href="/app/teams" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary">
              {isRu ? "Добавить команду" : "Add team"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
          <h1 className="text-2xl font-semibold text-slate-900">{isRu ? "Обзор стресса" : "Stress overview"}</h1>
          <p className="text-sm text-slate-600">
            {isRu ? "Краткий снимок состояния рабочего пространства." : "Quick snapshot of your StressSense workspace."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            <span>🔥</span>
            <span>{isRu ? `Серия опросов: ${streak} дн.` : `Survey streak: ${streak} days`}</span>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">At a glance</p>
            <h3 className="text-xl font-semibold text-slate-900">{isRu ? "Здоровье пространства" : "Workspace health"}</h3>
            <p className="text-sm text-slate-600 max-w-xl">
              {isRu ? "Стресс, участие и вовлечённость в одном виде." : "Snapshot of stress, participation, engagement."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Metric label={isRu ? "Средний индекс стресса" : "Average stress index"} value={hasTeams ? `${avgStress.toFixed(1)}` : "—"} />
            <Metric label={isRu ? "Уровень участия" : "Participation rate"} value={hasTeams ? `${participation}%` : "—"} />
            <Metric label={isRu ? "Индекс вовлечённости" : "Engagement score"} value={hasTeams ? `${avgEngagement.toFixed(1)}` : "—"} />
            <Metric label={isRu ? "Активных опросов" : "Active surveys"} value={activeSurveys ? `${activeSurveys}` : "0"} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {hasRuns ? (
          <SurveyReportWithAiPanel
            title={isRu ? "Отчёт по опросу" : "Survey report"}
            subtitle={isRu ? "Онлайн-просмотр" : "Live preview"}
            score={engagementScore || 0}
            delta={0}
            deltaDirection="flat"
            periodLabel={isRu ? "Последние 6 месяцев" : "Last 6 months"}
            timeseries={reportTimeseries}
            drivers={driverCards}
            ctaLabel={isRu ? "Проанализировать вовлечённость" : "Analyze engagement"}
            locale={locale}
            periodFrom={periodFrom}
            periodTo={periodTo}
          />
        ) : (
          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-base font-semibold text-slate-900">{isRu ? "Нет данных опросов" : "No survey data yet"}</p>
            <p className="text-slate-600">
              {isRu ? "Запустите первый опрос, чтобы увидеть тренды стресса и вовлечённости." : "Launch your first survey to see stress and engagement trends."}
            </p>
            <Link href="/app/surveys/new" className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105">
              {isRu ? "Запустить опрос" : "Start survey"}
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {isRu ? "AI инсайт" : "AI insight"}
          </p>
          {gateAdvanced ? (
            <p className="mt-3 text-sm text-slate-600">
              {isRu ? "Доступно через 7 дней после старта." : "Available in 7 days after start."}
            </p>
          ) : hasRuns ? (
            <>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>
                  {isRu
                    ? "• Вовлечённость стабильна, поддержку и признание стоит укреплять."
                    : "• Engagement steady; recognition and support drive sentiment."}
                </li>
                <li>
                  {isRu
                    ? "• Следите за нагрузкой в Product и уточняйте приоритеты недели."
                    : "• Watch workload spikes in Product; clarify weekly priorities."}
                </li>
                <li>
                  {isRu
                    ? "• Участие хорошее — короткие апдейты помогут удержать уровень."
                    : "• Participation is healthy; keep short updates to sustain it."}
                </li>
              </ul>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {isRu ? "AI сгенерировано" : "AI generated"}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              {isRu ? "Пока нет данных для инсайтов. Запустите опрос." : "No insights yet. Launch a survey to generate insights."}
            </p>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {isRu ? "Фокус недели" : "Your focus this week"}
            </p>
            <a href="/app/actions" className="text-sm font-semibold text-primary hover:underline">
              {isRu ? "Открыть Action center" : "Open Action center"}
            </a>
          </div>
          {gateAdvanced ? (
            <p className="mt-3 text-sm text-slate-600">
              {isRu ? "Фокус и действия появятся через 7 дней." : "Focus and actions will appear in 7 days."}
            </p>
          ) : focusActions.length > 0 ? (
            <div className="mt-3 space-y-3">
              {focusActions.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 shadow-inner">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{a.teamName}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{a.priority}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{dueLabel(a.dueInDays)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-600">{a.description}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {isRu ? "Драйвер" : "Driver"}: {a.driver} · {isRu ? "Опрос" : "Survey"} {a.sourceSurveyDate}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.tags.map((t) => (
                      <span key={t} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              {isRu ? "Пока нет активных действий. Начните с опроса или добавьте действие вручную." : "No actions yet. Start with a survey or add an action manually."}
            </p>
          )}
        </div>
      </section>

      {/* Убрали дублирующий блок "Фокус недели" с nudges */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{isRu ? "Недавние опросы" : "Recent surveys"}</h3>
        <div className="mt-3 space-y-2">
          {safeRuns.map((run: any) => (
            <div key={run.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm shadow-sm">
              <div>
                <p className="font-semibold text-slate-900">{run.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(run.launchedAt).toLocaleDateString()} · {isRu ? "стресс" : "stress"} {run.avgStressIndex?.toFixed(1) ?? "n/a"} ·{" "}
                  {isRu ? "вовлечённость" : "engagement"} {run.avgEngagementScore?.toFixed(1) ?? "n/a"}
                </p>
              </div>
            </div>
          ))}
          {safeRuns.length === 0 && <p className="text-sm text-slate-600">{isRu ? "Пока нет опросов." : "No surveys yet."}</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{isRu ? "Команды" : "Teams"}</h3>
            <p className="text-sm text-slate-600">
              {isRu ? "Стресс / Вовлечённость / Участие" : "Stress / Engagement / Participation"}
            </p>
          </div>
          <a href="/app/teams" className="text-sm font-semibold text-primary hover:underline">
            Все команды
          </a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {safeTeams.slice(0, 6).map((team: any) => (
            <div key={team.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                {(() => {
                  const statusValue = team.stressIndex ?? 0;
                  const statusLabel =
                    statusValue >= watchThreshold ? (isRu ? "В риске" : "At risk") : isRu ? "Watch" : "Watch";
                  const badgeClass =
                    statusValue >= watchThreshold ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
                  return (
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${badgeClass}`}>
                      {statusLabel}
                    </span>
                  );
                })()}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>{isRu ? "Стресс" : "Stress"} {(team.stressIndex ?? 0).toFixed(1)}</span>
                <span>{isRu ? "Вовл." : "Eng"} {(team.engagementScore ?? 0).toFixed(1)}</span>
                <span>{isRu ? "Участие" : "Part"} {Math.round(team.participation ?? 0)}%</span>
              </div>
            </div>
          ))}
          {safeTeams.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-600">
              Пока нет команд. Создайте команду, чтобы получать метрики.
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
