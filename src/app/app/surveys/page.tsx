import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/app/AccessDenied";
import { getCurrentUser } from "@/lib/auth";
import { computeSurveyStats } from "@/lib/surveys";
import { ensureOrgSettings, filterAccessibleSurveys } from "@/lib/access";

type Props = {
  searchParams?: { q?: string };
};

export default async function SurveysPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const q = (searchParams?.q ?? "").trim();

  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Stress surveys</h2>
        <AccessDenied />
      </div>
    );
  }
  const settings = await ensureOrgSettings(user.organizationId);
  if (user.role === "MANAGER" && !settings.allowManagerAccessToAllSurveys) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Stress surveys</h2>
        <AccessDenied />
      </div>
    );
  }
  const allSurveys = await filterAccessibleSurveys(
    user.id,
    user.organizationId,
    user.role === "ADMIN",
    settings.allowManagerAccessToAllSurveys
  );
  const surveys = allSurveys.filter((s) => (q ? s.name.toLowerCase().includes(q.toLowerCase()) : true));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Stress surveys</h2>
        <p className="text-sm text-slate-600">Plan, send and track quick stress pulses across your teams.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex w-full max-w-md items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search surveys"
            className="w-full rounded-full px-2 text-sm text-slate-800 outline-none"
          />
          <button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90">
            Search
          </button>
        </form>
        {user.role === "ADMIN" && (
          <Link
            href="/app/surveys/new"
            className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg"
          >
            New stress pulse
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {["Name", "Status", "Participation", "Target teams", "Last activity", "Actions"].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {surveys.map((survey) => {
              const stats = computeSurveyStats(survey.responses.length, survey.inviteTokens.length, [], []);
              const lastActivity = survey.endsAt ?? survey.createdAt;
              const participation = stats.participation;
              return (
                <tr key={survey.id} className="transition hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{survey.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={survey.status} />
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{participation}%</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {survey.targets.length} team{survey.targets.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {lastActivity ? new Date(lastActivity).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/app/surveys/${survey.id}`} className="text-sm font-semibold text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {surveys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-600">
                  No surveys yet. Create your first stress pulse.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    CLOSED: "bg-rose-50 text-rose-700 ring-rose-100",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${map[status] ?? map.DRAFT}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
