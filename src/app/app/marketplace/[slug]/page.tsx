import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { installApp } from "@/lib/marketplace";

type Props = { params: { slug: string } };

export default async function MarketplaceDetail({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const app = await prisma.marketplaceApp.findUnique({ where: { slug: params.slug } });
  if (!app || !app.isPublished) notFound();

  async function install() {
    "use server";
    if (!user) return;
    await installApp(app!.id, user.organizationId, user.id, {});
    redirect("/app/settings/installed-apps");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{app.category}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{app.name}</h1>
          <p className="text-sm text-slate-600">{app.description}</p>
        </div>
        <form action={install}>
          <button className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-sm">
            Install for workspace
          </button>
        </form>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">What you get</h3>
        <p className="mt-2 text-sm text-slate-600">
          This extension may add templates, automations or integrations to your workspace. Configure it after installation in Settings → Installed apps.
        </p>
      </div>
    </div>
  );
}
