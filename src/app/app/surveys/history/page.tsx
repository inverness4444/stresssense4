import Link from "next/link";

type SurveyRunMeta = {
  id: string;
  startedAt: Date;
  finishedAt: Date;
  score: number;
};

function formatDate(d: Date) {
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  if (mins <= 0) return `${secs} c`;
  return `${mins} мин ${secs.toString().padStart(2, "0")} c`;
}

export default function SurveyHistoryPage() {
  const runs: SurveyRunMeta[] = [
    { id: "run-1", startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000), finishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000), score: 7.1 },
    { id: "run-2", startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000), finishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 6 * 60 * 1000), score: 6.8 },
    { id: "run-3", startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 1000), finishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 9 * 60 * 1000), score: 7.4 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">StressSense</p>
          <h1 className="text-2xl font-semibold text-slate-900">История стресс-опросов</h1>
          <p className="text-sm text-slate-600">Во сколько начались опросы, сколько длились и итоговый балл.</p>
        </div>
        <Link href="/app/surveys" className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          К списку опросов
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Опрос</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Начало</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Длительность</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Результат (pt)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.map((run) => {
              const durationMs = run.finishedAt.getTime() - run.startedAt.getTime();
              return (
                <tr key={run.id} className="transition hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">Стресс-опрос #{run.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{formatDate(run.startedAt)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{formatDuration(durationMs)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{run.score.toFixed(1)} pt</td>
                </tr>
              );
            })}
            {runs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-600">
                  Пока нет пройденных опросов.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500">
        Данные демо: время и результат сохраняются локально. В продакшне здесь будет реальная аналитика по опросам.
      </p>
    </div>
  );
}
