import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getOneOnOneOverviewForManager, getGoalsOverviewForUser, getFeedbackAndRecognitionOverview } from "@/lib/peopleOverview";
import { generateOneOnOneAgendaSuggestions } from "@/lib/oneOnOneAiHelper";
import Link from "next/link";

export default async function ManagerPeoplePage() {
  const user = await getCurrentUser();
  if (!user) return <div className="rounded-2xl border border-slate-200 bg-white p-6">Unauthorized</div>;
  if (!["ADMIN", "HR", "MANAGER"].includes(user.role)) return <div className="rounded-2xl border border-slate-200 bg-white p-6">Нет доступа</div>;
  const enabled = await isFeatureEnabled("people_module_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) return <div className="rounded-2xl border border-slate-200 bg-white p-6">Модуль People выключен</div>;

  const [oneonone, goals, feedback] = await Promise.all([
    getOneOnOneOverviewForManager({ orgId: user.organizationId, managerId: user.id }),
    getGoalsOverviewForUser({ orgId: user.organizationId, userId: user.id }),
    getFeedbackAndRecognitionOverview({ orgId: user.organizationId, userId: user.id }),
  ]);

  const aiSuggestions =
    oneonone.relationships[0] &&
    (await generateOneOnOneAgendaSuggestions({
      orgId: user.organizationId,
      managerId: user.id,
      employeeId: oneonone.relationships[0].employeeId,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">People</p>
          <h1 className="text-2xl font-semibold text-slate-900">1:1, цели и признание</h1>
          <p className="text-sm text-slate-600">Быстрый обзор ваших 1:1, целей и обратной связи.</p>
        </div>
        <Link href="/app/manager/home" className="text-sm font-semibold text-primary">
          ← Назад в cockpit
        </Link>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">1:1 отношения</h2>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {oneonone.relationships.map((rel: any) => (
            <div key={rel.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{rel.employee.name}</p>
              <p className="text-xs text-slate-500">Следующая: {rel.nextPlannedAt ? new Date(rel.nextPlannedAt).toLocaleDateString() : "—"}</p>
            </div>
          ))}
          {oneonone.relationships.length === 0 && <p className="text-sm text-slate-500">Пока нет связей 1:1.</p>}
        </div>
        {aiSuggestions && (
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">AI suggested talking points</p>
            <ul className="mt-2 space-y-1">
              {aiSuggestions.map((p: string) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Мои цели</h2>
        </div>
        <div className="mt-3 space-y-3">
          {goals.activeGoals.map((g: any) => (
            <div key={g.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{g.title}</p>
              <p className="text-xs text-slate-500">Прогресс: {(g.progress * 100).toFixed(0)}%</p>
            </div>
          ))}
          {goals.activeGoals.length === 0 && <p className="text-sm text-slate-500">Активных целей нет.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Фидбэк и признание</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">Полученный фидбэк</p>
            <div className="mt-2 space-y-2">
              {feedback.feedbackAboutMe.map((f: any) => (
                <div key={f.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {f.comments ?? "Без комментария"} {f.rating ? `(${f.rating}/5)` : ""}
                </div>
              ))}
              {feedback.feedbackAboutMe.length === 0 && <p className="text-xs text-slate-500">Нет фидбэка.</p>}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Признание в команде</p>
            <div className="mt-2 space-y-2">
              {feedback.recognitionsReceived.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  {r.message}
                </div>
              ))}
              {feedback.recognitionsReceived.length === 0 && <p className="text-xs text-slate-500">Нет признаний.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
