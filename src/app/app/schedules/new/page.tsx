import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchedule } from "../actions";
import { ensureDefaultSurveyTemplate } from "@/lib/surveySeed";

export default async function NewSchedulePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app/schedules");

  const [teams, template, settings] = await Promise.all([
    prisma.team.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" } }),
    ensureDefaultSurveyTemplate(),
    prisma.organizationSettings.findUnique({ where: { organizationId: user.organizationId } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">New recurring stress pulse</h2>
        <p className="text-sm text-slate-600">Set up an automated cadence so teams stay in rhythm.</p>
      </div>

      <form
        action={async (formData) => {
          "use server";
          const frequency = (formData.get("frequency") as string) || "WEEKLY";
          const dayOfWeek = formData.get("dayOfWeek") ? Number(formData.get("dayOfWeek")) : null;
          const dayOfMonth = formData.get("dayOfMonth") ? Number(formData.get("dayOfMonth")) : null;
          const teamIds = formData.getAll("teamIds") as string[];
          const minResponses = formData.get("minResponsesForBreakdown")
            ? Number(formData.get("minResponsesForBreakdown"))
            : null;
          const startsOn = (formData.get("startsOn") as string) || null;

          const result = await createSchedule({
            name: (formData.get("name") as string) || "Stress Pulse cadence",
            description: (formData.get("description") as string) || "",
            frequency,
            dayOfWeek,
            dayOfMonth,
            teamIds,
            startsOn,
            minResponsesForBreakdown: minResponses,
          });
          if (result?.scheduleId) {
            redirect("/app/schedules");
          }
        }}
        className="space-y-6"
      >
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Basics</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">Name</span>
              <input
                name="name"
                defaultValue="Weekly Stress Pulse"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">Template</span>
              <select
                name="templateId"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                disabled
              >
                <option value={template.id}>{template.name}</option>
              </select>
            </label>
          </div>
          <label className="mt-3 block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Description (optional)</span>
            <textarea
              name="description"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Add context for HR or managers."
            />
          </label>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Cadence</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">Frequency</span>
              <select
                name="frequency"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                defaultValue="WEEKLY"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">Day of week</span>
              <select
                name="dayOfWeek"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                defaultValue="1"
              >
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">Day of month (for monthly/quarterly)</span>
              <input
                type="number"
                name="dayOfMonth"
                min={1}
                max={28}
                defaultValue={1}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">Start sending from (optional)</span>
              <input
                type="date"
                name="startsOn"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">Minimum responses per group</span>
              <input
                type="number"
                name="minResponsesForBreakdown"
                min={1}
                defaultValue={settings?.minResponsesForBreakdown ?? 4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-500">Defaults to workspace settings if left blank.</p>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Teams</p>
          <p className="text-sm text-slate-600">Select which teams should receive this pulse on each run.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {teams.map((team) => (
              <label key={team.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 shadow-sm">
                <div>
                  <p className="font-semibold">{team.name}</p>
                  <p className="text-xs text-slate-500">{team.description ?? "Team"}</p>
                </div>
                <input
                  type="checkbox"
                  name="teamIds"
                  value={team.id}
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                />
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg"
          >
            Create schedule
          </button>
        </div>
      </form>
    </div>
  );
}
