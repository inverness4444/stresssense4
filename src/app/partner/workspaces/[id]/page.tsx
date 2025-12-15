import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartnerUser } from "@/lib/partnerAuth";
import { prisma } from "@/lib/prisma";

export default async function PartnerWorkspaceDetail({ params }: { params: { id: string } }) {
  const user = await getPartnerUser();
  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          Please <Link className="text-primary hover:underline" href="/partner/auth/signin">sign in</Link> to view this workspace.
        </p>
      </div>
    );
  }
  const link = await prisma.partnerOrganization.findFirst({
    where: { partnerId: user.partnerId, organizationId: params.id },
    include: { organization: { include: { surveys: true } } },
  });
  if (!link) notFound();
  const org = link.organization;
  const responses = await prisma.surveyResponse.count({ where: { survey: { organizationId: org.id } } });
  const activeSurveys = await prisma.survey.count({ where: { organizationId: org.id, status: "ACTIVE" } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Workspace</p>
          <h1 className="text-2xl font-semibold text-slate-900">{org.name}</h1>
          <p className="text-sm text-slate-600">Region {org.region} · Active surveys {activeSurveys} · Total responses {responses}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Suggested actions</h3>
        <p className="text-sm text-slate-600">Share quick recommendations with the client.</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>· Review high-risk teams and schedule coaching.</li>
          <li>· Encourage follow-ups on recent pulses.</li>
          <li>· Consider rolling out automation recipes for nudges.</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Quick links</h3>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-primary hover:bg-slate-50" href="/app/overview">
            Open workspace
          </Link>
          <Link className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-primary hover:bg-slate-50" href="/app/surveys">
            View surveys
          </Link>
        </div>
      </div>
    </div>
  );
}
