import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/app/AccessDenied";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextRunDate } from "@/lib/surveySchedules";
import { runSchedulesNow } from "./actions";
import { ensureOrgSettings } from "@/lib/access";
import { isFeatureEnabled } from "@/lib/features";

export default async function SchedulesPage() {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (user.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Recurring pulses</h2>
        <AccessDenied />
      </div>
    );
  }

  const settings = await ensureOrgSettings(user.organizationId);
  if (!isFeatureEnabled("schedules", settings)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Расписания отключены для этой организации.</p>
      </div>
    );
  }

  const schedules = await prisma.surveySchedule.findMany({
    where: { organizationId: user.organizationId },
    include: { targets: { include: { team: true } }, surveys: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Recurring stress pulses</h2>
          <p className="text-sm text-slate-600">Automate weekly or monthly stress pulses for your teams.</p>
        </div>
        <div className="flex items-center gap-2">
          <form
            action={async () => {
              "use server";
              await runSchedulesNow();
            }}
          >
            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
              Run now (for testing)
            </button>
          </form>
          <Link
            href="/app/schedules/new"
            className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg"
          >
            New recurring pulse
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {["Name", "Frequency", "Next run", "Teams", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedules.map((schedule) => {
              const lastSurvey = schedule.surveys[0];
              const nextRun = nextRunDate(
                { frequency: schedule.frequency, dayOfWeek: schedule.dayOfWeek, dayOfMonth: schedule.dayOfMonth, startsOn: schedule.startsOn },
                new Date()
              );
              return (
                <tr key={schedule.id} className="text-sm transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-900">{schedule.name}</td>
                  <td className="px-4 py-3 text-slate-700">{formatFrequency(schedule.frequency, schedule)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {nextRun ? nextRun.toLocaleDateString() : "—"}{" "}
                    {lastSurvey ? `(last: ${new Date(lastSurvey.createdAt).toLocaleDateString()})` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{schedule.targets.length} teams</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        schedule.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-100 text-slate-700 ring-slate-200"
                      }`}
                    >
                      {schedule.isActive ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href="/app/schedules/new" className="text-sm font-semibold text-primary hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {schedules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-600">
                  No recurring pulses yet. Create one to keep stress signals fresh.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatFrequency(freq: string, schedule: { dayOfWeek: number | null; dayOfMonth: number | null }) {
  if (freq === "WEEKLY") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `Weekly on ${days[schedule.dayOfWeek ?? 1]}`;
  }
  if (freq === "MONTHLY") return `Monthly on day ${schedule.dayOfMonth ?? 1}`;
  if (freq === "QUARTERLY") return `Quarterly on day ${schedule.dayOfMonth ?? 1}`;
  return freq;
}
