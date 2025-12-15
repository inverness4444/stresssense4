import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startCheckout } from "./actions";
import { ensureOrgSettings } from "@/lib/access";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function BillingPage({ searchParams }: { searchParams?: { status?: string } }) {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (user.role !== "ADMIN") redirect("/app/overview");

  const [plans, subscription, org, settings] = await Promise.all([
    prisma.plan.findMany({ orderBy: { monthlyPriceCents: "asc" } }),
    prisma.subscription.findUnique({ where: { organizationId: user.organizationId }, include: { plan: true } }),
    prisma.organization.findUnique({ where: { id: user.organizationId }, include: { users: true, teams: true } }),
    ensureOrgSettings(user.organizationId),
  ]);

  const status = searchParams?.status;
  const activePlan = subscription?.plan;
  const employeesCount = org?.users.length ?? 0;
  const teamsCount = org?.teams.length ?? 0;
  const warnEmployees = activePlan?.maxEmployees != null && employeesCount >= activePlan.maxEmployees;
  const warnTeams = activePlan?.maxTeams != null && teamsCount >= activePlan.maxTeams;

  return (
    <div className="space-y-6">
      <PageTitle title="Billing" subtitle="Manage your plan and subscription." />

      {status === "success" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          Подписка обновлена. Добро пожаловать на {activePlan?.name ?? "Pro"}.
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Current plan</h3>
        <p className="text-sm text-slate-700">
          {activePlan ? activePlan.name : "Free"} · Status: {subscription?.status ?? "none"}
        </p>
        <p className="text-xs text-slate-600">
          Seats: {subscription?.usedSeats ?? employeesCount}/{subscription?.seats ?? activePlan?.baseSeats ?? "∞"} · Employees {employeesCount} · Teams {teamsCount}
        </p>
        {(warnEmployees || warnTeams) && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
            {warnEmployees && <>Лимит сотрудников исчерпан.</>} {warnTeams && <>Лимит команд исчерпан.</>}
            <Link href="/app/billing" className="text-primary hover:underline">
              Обновить план
            </Link>
          </p>
        )}
      </div>

      <SectionHeader title="Choose your plan" subtitle="Тарифы для разных размеров команд." />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <form
            key={plan.id}
            action={async () => {
              "use server";
              const res = await startCheckout(plan.id);
              if (res?.url) redirect(res.url);
            }}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-900">{plan.name}</h4>
              {plan.name === "Free" && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Current</span>}
            </div>
            <p className="text-sm text-slate-600 mt-1">{plan.description ?? ""}</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {plan.monthlyPriceCents === 0 ? "$0" : `$${plan.monthlyPriceCents / 100}`}
              <span className="text-base font-normal text-slate-600"> / month</span>
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li>До {plan.maxEmployees ?? "∞"} сотрудников</li>
              <li>Активные опросы: {plan.maxActiveSurveys ?? "∞"}</li>
              <li>Команды: {plan.maxTeams ?? "∞"}</li>
            </ul>
            <button
              type="submit"
              className="mt-auto rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02]"
            >
              {plan.name === activePlan?.name ? "Текущий план" : "Выбрать план"}
            </button>
          </form>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Usage this period</h3>
        <p className="text-sm text-slate-600">Key metrics we track for billing.</p>
        <ul className="mt-3 space-y-1 text-sm text-slate-700">
          <li>Seats: {subscription?.usedSeats ?? employeesCount}</li>
          <li>AI requests: tracked via usage records</li>
          <li>Automation runs / API calls: tracked via usage records</li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Add-ons</h3>
        <p className="text-sm text-slate-600">Extend capabilities with AI+ or Automation+.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">AI+ (extra AI requests)</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">Automation+ (more workflows)</span>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Invoices</h3>
        <InvoicesList organizationId={user.organizationId} />
      </section>

      {subscription?.stripeCustomerId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          Управление платежами происходит в Stripe. Если нужен доступ к биллингу, напишите нам.
          <div className="mt-2">
            <Link href="https://billing.stripe.com" className="text-primary font-semibold">
              Открыть портал Stripe
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

async function InvoicesList({ organizationId }: { organizationId: string }) {
  const invoices = await prisma.invoice.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { lineItems: true },
  });
  if (!invoices.length) return <p className="text-sm text-slate-600">No invoices yet.</p>;
  return (
    <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
      {invoices.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-slate-900">{inv.number ?? inv.stripeInvoiceId ?? inv.id}</p>
            <p className="text-xs text-slate-500">
              {new Date(inv.createdAt).toLocaleDateString()} · {inv.status} · ${(inv.amountCents / 100).toFixed(2)}
            </p>
          </div>
          {inv.pdfUrl && (
            <a className="text-primary hover:underline" href={inv.pdfUrl} target="_blank">
              PDF
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
