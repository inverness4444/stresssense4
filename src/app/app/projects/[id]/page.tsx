import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Please sign in.</div>;

  const project = await prisma.projectSpace.findFirst({
    where: { id: params.id, ownerOrgId: user.organizationId },
  });
  if (!project) notFound();

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Project</p>
      <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
      <p className="text-sm text-slate-600">{project.description}</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Program overview coming soon: risk heatmaps, shared action items, progress.</p>
      </div>
    </div>
  );
}
