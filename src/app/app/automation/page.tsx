import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AutomationPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Please sign in.</div>;

  const workflows = await prisma.automationWorkflow.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Automation</p>
          <h1 className="text-2xl font-semibold text-slate-900">Workflows & recipes</h1>
          <p className="text-sm text-slate-600">Trigger follow-ups, nudges, actions and integrations.</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {workflows.map((wf: any) => (
          <div key={wf.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">{wf.name}</p>
              <p className="text-xs text-slate-500">
                Trigger: {wf.triggerType} {wf.triggerEvent ?? wf.scheduleCron ?? ""}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-700">{wf.isActive ? "Active" : "Paused"}</span>
          </div>
        ))}
        {workflows.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No workflows yet.</p>}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Recipes</p>
        <p className="mt-1 text-slate-600">Use marketplace automation apps to create workflows quickly.</p>
        <Link href="/app/marketplace" className="mt-2 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white">
          Browse marketplace
        </Link>
      </div>
    </div>
  );
}
