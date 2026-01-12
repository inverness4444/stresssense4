import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSurvey } from "../actions";
import { ensureDefaultSurveyTemplate } from "@/lib/surveySeed";

async function createSurveyAction(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string) || "Stress Pulse";
  const description = (formData.get("description") as string) || "";
  const startNow = formData.get("startNow") === "on";
  const startsAt = (formData.get("startsAt") as string) || "";
  const endsAt = (formData.get("endsAt") as string) || "";
  const defaultMin = Number(formData.get("defaultMinResponses") || 4);
  const minResponses = Number(formData.get("minResponsesForBreakdown") || defaultMin || 4);
  const teamIds = formData.getAll("teamIds") as string[];

  const result = await createSurvey({
    name,
    description,
    teamIds,
    startNow,
    startsAt,
    endsAt,
    minResponsesForBreakdown: minResponses,
  });
  if (result?.success) {
    redirect(`/app/surveys`);
  }
}

export default async function NewSurveyPage() {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(role)) {
    redirect("/app/surveys");
  }

  const [teams, template, settings] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      include: { users: true },
    }),
    ensureDefaultSurveyTemplate(),
    prisma.organizationSettings.findUnique({ where: { organizationId: user.organizationId } }),
  ]);

  const defaultCount = teams.reduce((acc: number, t: any) => acc + (t.users?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">New stress pulse</h2>
        <p className="text-sm text-slate-600">Create a quick Stress Pulse and target the right teams.</p>
      </div>
      <NewSurveyForm
        teams={teams.map((t: any) => ({ id: t.id, name: t.name, members: t.users.length }))}
        defaultTemplate={template}
        totalMembers={defaultCount}
        defaultMinResponses={settings?.minResponsesForBreakdown ?? 4}
      />
    </div>
  );
}

function NewSurveyForm({
  teams,
  defaultTemplate,
  totalMembers,
  defaultMinResponses,
}: {
  teams: { id: string; name: string; members: number }[];
  defaultTemplate: { id: string; name: string };
  totalMembers: number;
  defaultMinResponses: number;
}) {
  return (
    <form
      action={createSurveyAction}
      className="space-y-6"
    >
      <input type="hidden" name="defaultMinResponses" value={defaultMinResponses} />
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Step 1</p>
        <h3 className="text-lg font-semibold text-slate-900">Basic setup</h3>
        <div className="mt-4 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Pulse name</span>
            <input
              name="name"
              defaultValue="Q1 Stress Pulse"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Description</span>
            <textarea
              name="description"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Optional summary for admins and managers"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Template</span>
            <select
              name="templateId"
              defaultValue={defaultTemplate.id}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled
            >
              <option value={defaultTemplate.id}>{defaultTemplate.name}</option>
            </select>
            <p className="text-xs text-slate-500">Stress Pulse v1 (preloaded)</p>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Step 2</p>
        <h3 className="text-lg font-semibold text-slate-900">Who to include</h3>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">Estimated reach: {totalMembers} people (based on current team membership). Select teams below.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {teams.map((team) => (
              <label key={team.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 shadow-sm">
                <div>
                  <p className="font-semibold">{team.name}</p>
                  <p className="text-xs text-slate-500">{team.members} people</p>
                </div>
                <input
                  type="checkbox"
                  name="teamIds"
                  value={team.id}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                  defaultChecked
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Step 3</p>
        <h3 className="text-lg font-semibold text-slate-900">Timing & anonymity</h3>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" name="startNow" defaultChecked className="rounded border-slate-300 text-primary focus:ring-primary/40" />
            Start now
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">Start date/time</span>
              <input
                type="datetime-local"
                name="startsAt"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-800">End date/time (optional)</span>
              <input
                type="datetime-local"
                name="endsAt"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Minimum responses per group</span>
            <input
              type="number"
              name="minResponsesForBreakdown"
              min={1}
              defaultValue={defaultMinResponses}
              className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-slate-500">Hide team-level results until this many responses are collected.</p>
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg"
        >
          Create survey
        </button>
      </div>
    </form>
  );
}
