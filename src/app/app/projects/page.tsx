import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Please sign in.</div>;

  const projects = await prisma.projectSpace.findMany({
    where: { ownerOrgId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Projects</p>
        <h1 className="text-2xl font-semibold text-slate-900">Program spaces</h1>
        <p className="text-sm text-slate-600">Coordinate cross-team stress programs.</p>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {projects.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500">{p.description}</p>
            </div>
            <Link href={`/app/projects/${p.id}`} className="text-sm font-semibold text-primary hover:underline">
              View
            </Link>
          </div>
        ))}
        {projects.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No projects yet.</p>}
      </div>
    </div>
  );
}
