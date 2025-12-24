import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getBillingOverview } from "@/lib/billingOverview";
import { applyPromoCode, generateReferralCode, updateSubscriptionSeats, payLatestInvoice } from "./actions";
import { getTierForSeats } from "@/lib/pricingTiers";
import { getLocale } from "@/lib/i18n-server";

export default async function BillingPage() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  const orgId = user!.organizationId;
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user!.id });
  const role = (user!.role ?? "").toUpperCase();
  if (!enabled || !["ADMIN", "HR"].includes(role)) redirect("/app/overview");

  const data = await getBillingOverview(orgId);
  const subscription = data.subscription;
  const plan = data.plan;
  const usdToRub = 100;

  async function applyPromo(formData: FormData) {
    "use server";
    const code = (formData.get("code") as string) ?? "";
    await applyPromoCode(orgId, code.trim());
  }

  async function changeSeats(formData: FormData) {
    "use server";
    const seats = Number(formData.get("seats") ?? "0");
    if (Number.isFinite(seats) && seats > 0) {
      await updateSubscriptionSeats(orgId, seats);
    }
  }

  async function createReferral() {
    "use server";
    await generateReferralCode(orgId);
  }

  async function payPlan() {
    "use server";
    await payLatestInvoice(orgId);
  }

  const formatUsd = (value: number) => `$${Number.isFinite(value) ? value.toFixed(2) : "0.00"}`;
  const formatRub = (value: number) => `${Math.round(value * usdToRub).toLocaleString("ru-RU")} ₽`;
  const formatMoney = (value: number) => (isRu ? formatRub(value) : formatUsd(value));
  const balanceUsd = (data.balanceCents ?? 0) / 100;
  const balanceDisplay = formatMoney(balanceUsd);
  const pendingSeats = typeof data.pendingSeats === "number" ? data.pendingSeats : null;
  const pendingInvoiceId = typeof data.pendingInvoiceId === "string" ? data.pendingInvoiceId : null;
  const currentSeats = typeof data.seatsConfigured === "number" ? data.seatsConfigured : data.seatsUsed;
  const currentTier = getTierForSeats(currentSeats);
  const seatsForPricing = pendingSeats ?? currentSeats;
  const nextTier = getTierForSeats(seatsForPricing);
  const useDerivedPlan =
    !plan?.name ||
    typeof plan?.monthlyPriceCents !== "number" ||
    (plan.monthlyPriceCents === 0 && currentTier.priceUsd > 0);
  const planName = useDerivedPlan ? currentTier.label : plan.name;
  const planPriceUsd = useDerivedPlan ? currentTier.priceUsd : plan.monthlyPriceCents / 100;
  const planStatus = subscription?.status ?? null;
  const openInvoice =
    data.invoices.find((inv: any) => inv.status === "open" && (!pendingInvoiceId || inv.id === pendingInvoiceId)) ??
    data.invoices.find((inv: any) => inv.status === "open");
  const nextInvoice = openInvoice ?? data.invoices[0];
  const nextPaymentDate = nextInvoice?.periodEnd ? new Date(nextInvoice.periodEnd) : null;
  const nextAmountCents =
    typeof nextInvoice?.amountCents === "number" ? nextInvoice.amountCents : Math.round(nextTier.priceUsd * 100);
  const amountDisplay = isRu
    ? `${Math.round((nextAmountCents / 100) * usdToRub).toLocaleString("ru-RU")} ₽`
    : `$${(nextAmountCents / 100).toFixed(2)}`;
  const daysLeft = nextPaymentDate ? Math.max(0, Math.ceil((nextPaymentDate.getTime() - Date.now()) / 86400000)) : null;
  const planLabel = `${pendingSeats ? nextTier.label : planName} · 1 мес`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">Billing & plans</h2>
        <p className="text-sm text-slate-600">Управление тарифом, местами и промокодами.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Текущий план</h3>
          <p className="text-sm text-slate-600">
            {planName}
            {planStatus ? ` · ${planStatus}` : ""}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-800">
            <p>Цена: {formatMoney(planPriceUsd)} / мес</p>
            <p>Мест: {currentSeats} (используется {data.seatsUsed})</p>
            {pendingSeats != null && (
              <p className="text-xs font-semibold text-amber-600">Ожидает оплаты: {pendingSeats} мест</p>
            )}
            <p>Баланс: {balanceDisplay}</p>
            {data.trialDaysLeft !== null && <p>Trial: осталось {data.trialDaysLeft} дн.</p>}
          </div>
          <form action={changeSeats} className="mt-4 flex items-center gap-2">
            <input
              name="seats"
              type="number"
              min={data.seatsUsed}
              defaultValue={pendingSeats ?? data.seatsConfigured ?? data.seatsUsed}
              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
              Обновить места
            </button>
          </form>
          {pendingSeats != null && (
            <p className="mt-2 text-xs text-amber-600">Тариф применится только после оплаты.</p>
          )}
          <form action="/app/settings/billing/top-up" method="get" className="mt-3 flex items-center gap-2">
            <input
              name="amount"
              type="number"
              min={1}
              step="1"
              defaultValue={100}
              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
              Пополнить
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Подписки</h3>
            <span className="text-slate-400">›</span>
          </div>
          <div className="mt-4 rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xl font-semibold">{planLabel}</p>
                <p className="text-sm text-teal-100">
                  {nextPaymentDate ? `${nextPaymentDate.toLocaleDateString("ru-RU")} следующий платеж` : "Следующий платеж —"}
                </p>
                <p className="text-2xl font-semibold">{amountDisplay}</p>
              </div>
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[10px] border-white/10" />
                <div className="absolute inset-0 rounded-full border-[10px] border-teal-300 border-t-transparent" />
                <div className="text-center">
                  <p className="text-2xl font-semibold">{daysLeft ?? "—"}</p>
                  <p className="text-xs text-teal-100">дня</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-teal-100">Подробнее →</span>
              <form action={payPlan}>
                <button
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
                  disabled={!openInvoice}
                >
                  Оплатить тариф
                </button>
              </form>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Промокод</h4>
            <form action={applyPromo} className="flex gap-2">
              <input
                name="code"
                placeholder="PROMO2025"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                Применить
              </button>
            </form>
            <div className="pt-2">
              <p className="text-sm font-semibold text-slate-900">Referral</p>
              <form action={createReferral} className="mt-2 flex items-center gap-2">
                <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
                  Сгенерировать ссылку
                </button>
              </form>
              {data.referralCodes.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {data.referralCodes.map((r: any) => (
                    <li key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>{r.code}</span>
                      <button
                        className="text-xs font-semibold text-primary underline underline-offset-4"
                        onClick={async () => {
                          "use server";
                        }}
                      >
                        Copy
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Инвойсы</h3>
        <div className="mt-3 divide-y divide-slate-100">
          {data.invoices.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between py-2 text-sm text-slate-800">
              <div>
                <p className="font-semibold">Счет {inv.id.slice(0, 6)}</p>
                <p className="text-xs text-slate-500">
                  {inv.periodEnd ? new Date(inv.periodEnd).toLocaleDateString() : "—"}
                </p>
              </div>
              <div className="text-right">
                <p>{formatMoney((inv.amountCents ?? 0) / 100)}</p>
                <p className="text-xs text-slate-500">{inv.status}</p>
              </div>
            </div>
          ))}
          {data.invoices.length === 0 && <p className="text-sm text-slate-500">Инвойсов пока нет.</p>}
        </div>
      </div>
    </div>
  );
}
