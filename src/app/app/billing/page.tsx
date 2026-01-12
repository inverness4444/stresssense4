import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureOrgSettings } from "@/lib/access";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SeatPricingSelector } from "@/components/pricing/SeatPricingSelector";
import { MIN_SEATS, calculateSeatTotal, getPricePerSeat, resolveCurrency } from "@/config/pricing";
import { formatMoney } from "@/lib/formatMoney";
import { getLocale } from "@/lib/i18n-server";

export default async function BillingPage({ searchParams }: { searchParams?: { status?: string } }) {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) redirect("/app/overview");
  const locale = await getLocale();
  const isRu = locale === "ru";

  const [subscription, org, _settings] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId: user.organizationId } }),
    prisma.organization.findUnique({ where: { id: user.organizationId }, include: { users: true, teams: true } }),
    ensureOrgSettings(user.organizationId),
  ]);

  const status = searchParams?.status;
  const employeesCount = org?.users.length ?? 0;
  const teamsCount = org?.teams.length ?? 0;
  const currentSeatsRaw = (subscription as any)?.seats ?? employeesCount;
  const currentSeats = Math.max(currentSeatsRaw, MIN_SEATS);
  const currency = resolveCurrency(locale);
  const formatPrice = (value: number) => formatMoney(value, locale, currency);
  const pricePerSeat = getPricePerSeat(currency);
  const monthlyTotal = calculateSeatTotal(currentSeats, currency);

  return (
    <div className="space-y-6">
      <PageTitle title={isRu ? "Биллинг" : "Billing"} subtitle={isRu ? "Управление местами и подпиской." : "Manage seats and subscription."} />

      {status === "success" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          {isRu ? "Места обновлены." : "Seats updated."}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{isRu ? "Подписка per seat" : "Per-seat subscription"}</h3>
        <p className="text-sm text-slate-700">
          {isRu ? "Цена за место" : "Price per seat"} · {isRu ? "Статус" : "Status"}: {subscription?.status ?? "none"}
        </p>
        <p className="text-xs text-slate-600">
          {isRu ? "Мест" : "Seats"}: {currentSeats} · {isRu ? "Сотрудники" : "Employees"} {employeesCount} · {isRu ? "Команды" : "Teams"} {teamsCount}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <span>
            {isRu ? "Цена за место" : "Price per seat"}: <strong>{formatPrice(pricePerSeat)}</strong> {isRu ? "/ мес" : "/ mo"}
          </span>
          <span>
            {isRu ? "Итого" : "Total"}: <strong>{formatPrice(monthlyTotal)}</strong> {isRu ? "/ мес" : "/ mo"}
          </span>
        </div>
      </div>

      <SectionHeader title={isRu ? "Места" : "Seats"} subtitle={isRu ? "Минимум 10 мест и прозрачная стоимость." : "Minimum 10 seats with a clear monthly total."} />
      <SeatPricingSelector
        locale={locale}
        defaultSeats={currentSeats}
        title={isRu ? "Цена за место" : "Price per seat"}
        description={isRu ? "Минимум 10 мест. Месячная оплата." : "Minimum 10 seats. Billed monthly."}
        minSeatsHint={isRu ? "Минимум 10 мест" : "Minimum 10 seats"}
        seatsLabel={isRu ? "Количество мест" : "Seats"}
        totalLabel={isRu ? "Итого" : "Total"}
        perSeatLabel={isRu ? "за место" : "per seat"}
        cta={
          <Link
            href="/app/settings/billing"
            className="inline-flex rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-sm"
          >
            {isRu ? "Управлять местами" : "Manage seats"}
          </Link>
        }
      />

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
      {invoices.map((inv: any) => (
        <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-slate-900">{inv.number ?? inv.stripeInvoiceId ?? inv.id}</p>
            <p className="text-xs text-slate-500">
              {(() => {
                const currency = typeof inv.currency === "string" ? inv.currency.toUpperCase() : "RUB";
                const amount = (inv.amountCents ?? 0) / 100;
                const formatted = new Intl.NumberFormat("ru-RU", { style: "currency", currency }).format(amount);
                return `${new Date(inv.createdAt).toLocaleDateString()} · ${inv.status} · ${formatted}`;
              })()}
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
