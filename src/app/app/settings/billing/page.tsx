import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getBillingOverview } from "@/lib/billingOverview";
import { updateSubscriptionSeats, payLatestInvoice, setSubscriptionActive } from "./actions";
import { SeatPricingSelector } from "@/components/pricing/SeatPricingSelector";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { BASE_CURRENCY, type PaymentMethod } from "@/config/payments";
import { formatMoney, getLocaleKey } from "@/lib/formatMoney";
import { getBillingGateStatus } from "@/lib/billingGate";
import { differenceInCalendarDays } from "date-fns";
import { MIN_SEATS, calculateSeatTotal, getPricePerSeat, resolveCurrency } from "@/config/pricing";

export default async function BillingPage() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const balanceLocale = getLocaleKey(locale);
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  const orgId = user!.organizationId;
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user!.id });
  const role = (user!.role ?? "").toUpperCase();
  if (!enabled || !["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) redirect("/app/overview");

  const data = await getBillingOverview(orgId, user!.id);
  const [transactions, topups] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.topupRequest.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const subscription = data.subscription;

  async function changeSeats(formData: FormData) {
    "use server";
    const seats = Number(formData.get("seats") ?? "0");
    if (Number.isFinite(seats) && seats > 0) {
      await updateSubscriptionSeats(orgId, seats);
    }
  }

  async function paySubscription() {
    "use server";
    await payLatestInvoice(orgId);
  }

  async function toggleSubscription(formData: FormData) {
    "use server";
    const active = formData.get("active") === "true";
    await setSubscriptionActive(orgId, active);
  }

  const currency = resolveCurrency(locale);
  const formatPrice = (value: number) => formatMoney(value, locale, currency);
  const formatCurrency = (value: number, currency: string) =>
    formatMoney(value, locale, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatBalance = (value: number) =>
    formatMoney(value, locale, BASE_CURRENCY, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const balanceValue = typeof data.walletBalance === "number" ? data.walletBalance : (data.balanceCents ?? 0) / 100;
  const balanceDisplay = formatBalance(balanceValue);
  const pendingSeats = typeof data.pendingSeats === "number" ? data.pendingSeats : null;
  const pendingInvoiceId = typeof data.pendingInvoiceId === "string" ? data.pendingInvoiceId : null;
  const currentSeatsRaw = typeof data.seatsConfigured === "number" ? data.seatsConfigured : data.seatsUsed;
  const currentSeats = Math.max(currentSeatsRaw, MIN_SEATS);
  const seatsForPricing = pendingSeats ?? currentSeats;
  const pricePerSeat = getPricePerSeat(currency);
  const monthlyTotal = calculateSeatTotal(seatsForPricing, currency);
  const subscriptionStatus = subscription?.status ?? null;
  const openInvoice =
    data.invoices.find((inv: any) => inv.status === "open" && (!pendingInvoiceId || inv.id === pendingInvoiceId)) ??
    data.invoices.find((inv: any) => inv.status === "open");
  const nextInvoice = openInvoice ?? data.invoices[0];
  const nextPaymentDate = nextInvoice?.periodEnd ? new Date(nextInvoice.periodEnd) : null;
  const nextPeriodStart = nextInvoice?.periodStart ? new Date(nextInvoice.periodStart) : null;
  const nextAmountValue = Number.isFinite(monthlyTotal) ? monthlyTotal : null;
  const gateStatus = await getBillingGateStatus(orgId, (user as any)?.organization?.createdAt ?? null);
  const trialDaysLeft = gateStatus.trialActive
    ? Math.max(0, differenceInCalendarDays(gateStatus.trialEndsAt, new Date()))
    : null;
  const subscriptionActive = gateStatus.subscriptionActive;
  const subscriptionCancelAt =
    data.subscriptionCancelAt instanceof Date
      ? data.subscriptionCancelAt
      : data.subscriptionCancelAt
        ? new Date(data.subscriptionCancelAt)
        : null;
  const cancelScheduled = Boolean(subscriptionCancelAt && subscriptionCancelAt.getTime() > Date.now());
  const cancelDateLabel = cancelScheduled ? subscriptionCancelAt!.toLocaleDateString(balanceLocale) : null;
  const showFreePlan = !gateStatus.hasPaidAccess;
  const amountDisplay = showFreePlan
    ? isRu
      ? "Бесплатно"
      : "Free"
    : typeof nextAmountValue === "number"
      ? `${formatPrice(nextAmountValue)}${isRu ? " / мес" : " / mo"}`
      : "—";
  const daysLeft = showFreePlan
    ? trialDaysLeft
    : nextPaymentDate
      ? Math.max(0, Math.ceil((nextPaymentDate.getTime() - Date.now()) / 86400000))
      : null;
  const totalDays = showFreePlan
    ? 7
    : nextPeriodStart && nextPaymentDate
      ? Math.max(1, Math.ceil((nextPaymentDate.getTime() - nextPeriodStart.getTime()) / 86400000))
      : 30;
  const progress = daysLeft != null ? Math.min(1, Math.max(0, daysLeft / totalDays)) : 1;
  const ringRadius = 60;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);
  const subscriptionLabel = showFreePlan
    ? isRu
      ? "Бесплатная подписка"
      : "Free trial"
    : `${isRu ? "Цена за место" : "Price per seat"} · ${isRu ? "1 мес" : "1 mo"}`;
  const hasSufficientBalance = nextAmountValue != null ? balanceValue >= nextAmountValue : false;
  const canPay = Boolean(openInvoice) && hasSufficientBalance;
  const toggleActiveValue = cancelScheduled ? "true" : subscriptionActive ? "false" : "true";
  const toggleLabel = cancelScheduled
    ? t(locale, "billingSubscriptionCancelUndo")
    : subscriptionActive
      ? t(locale, "billingSubscriptionToggleDeactivate")
      : t(locale, "billingSubscriptionToggleActivate");

  const typeLabel = (type: string) => {
    if (type === "manual_deposit") return isRu ? "Пополнение" : "Deposit";
    if (type === "manual_withdraw") return isRu ? "Списание" : "Withdrawal";
    return isRu ? "Коррекция" : "Adjustment";
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return isRu ? "Подтверждено" : "Approved";
    if (status === "rejected") return isRu ? "Отклонено" : "Rejected";
    return isRu ? "Ожидает" : "Pending";
  };

  const methodLabels: Record<PaymentMethod, string> = {
    sbp: isRu ? "СБП" : "SBP",
    card: isRu ? "Карта" : "Card",
    crypto: isRu ? "Криптовалюта (USDT)" : "Crypto (USDT)",
    other: isRu ? "Другое" : "Other",
  };
  const methodLabel = (method: string) =>
    method === "yookassa" ? "YooKassa" : methodLabels[method as PaymentMethod] ?? method;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">{isRu ? "Биллинг и места" : "Billing & seats"}</h2>
        <p className="text-sm text-slate-600">
          {isRu ? "Управление местами и платежами." : "Manage seats and payments."}
        </p>
        <p className="text-xs text-slate-500">{isRu ? "ИНН 771377620451" : "INN 771377620451"}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{isRu ? "Подписка" : "Subscription"}</h3>
                <p className="text-sm text-slate-600">
                  {isRu ? "Цена за место" : "Price per seat"}
                  {subscriptionStatus ? ` · ${subscriptionStatus}` : ""}
                </p>
              </div>
              <form action={toggleSubscription}>
                <input type="hidden" name="active" value={toggleActiveValue} />
                <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100">
                  {toggleLabel}
                </button>
              </form>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t(locale, "billingSubscriptionStatusTitle")}</p>
                  <p className="text-xs text-slate-600">
                    {subscriptionActive ? t(locale, "billingSubscriptionActive") : t(locale, "billingSubscriptionInactive")}
                  </p>
                  {cancelScheduled && cancelDateLabel && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      {t(locale, "billingSubscriptionCancelScheduled")} {cancelDateLabel}
                    </p>
                  )}
                  {!subscriptionActive && (
                    <p className="mt-1 text-[11px] text-amber-600">{t(locale, "billingSubscriptionAiNote")}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm font-semibold text-slate-900">
                  {nextPaymentDate
                    ? `${nextPaymentDate.toLocaleDateString(balanceLocale)} ${isRu ? "следующий платеж" : "next payment"}`
                    : isRu
                      ? "Дата платежа не назначена"
                      : "No next payment scheduled"}
                </div>
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
                    <circle
                      cx="80"
                      cy="80"
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(15, 118, 110, 0.15)"
                      strokeWidth="12"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r={ringRadius}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                      strokeDashoffset={ringOffset}
                    />
                  </svg>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-slate-900">{daysLeft ?? "—"}</p>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{isRu ? "дня" : "days"}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <form action={changeSeats}>
                <SeatPricingSelector
                  locale={locale}
                  defaultSeats={seatsForPricing}
                  title={isRu ? "Цена за место" : "Price per seat"}
                  description={isRu ? "Минимум 10 мест. Месячная оплата." : "Minimum 10 seats. Billed monthly."}
                  minSeatsHint={isRu ? "Минимум 10 мест" : "Minimum 10 seats"}
                  seatsLabel={isRu ? "Количество мест" : "Seats"}
                  totalLabel={isRu ? "Итого" : "Total"}
                  perSeatLabel={isRu ? "за место" : "per seat"}
                  showTotal={false}
                  showHeader={false}
                  variant="plain"
                  cta={
                    <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
                      {isRu ? "Обновить места" : "Update seats"}
                    </button>
                  }
                />
              </form>
              {pendingSeats != null && (
                <p className="mt-2 text-xs text-amber-600">
                  {isRu ? "Изменение вступит в силу после оплаты." : "Changes apply after payment."}
                </p>
              )}
            </div>
            <div className="mt-4 space-y-3 text-base text-slate-800">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">{isRu ? "Мест" : "Seats"}</span>
                <span className="font-medium text-slate-900">
                  {seatsForPricing} ({isRu ? "используется" : "used"} {data.seatsUsed})
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 font-semibold text-slate-900">
                <span>{isRu ? "Итого" : "Total"}</span>
                <span>{formatPrice(monthlyTotal)} {isRu ? "/ мес" : "/ mo"}</span>
              </div>
              {pendingSeats != null && (
                <div className="flex items-center justify-between gap-4 text-sm font-semibold text-amber-600">
                  <span>{isRu ? "Ожидает оплаты" : "Pending payment"}</span>
                  <span>{pendingSeats} {isRu ? "мест" : "seats"}</span>
                </div>
              )}
              {openInvoice && (
                <form action={paySubscription} className="pt-1">
                  <button
                    type="submit"
                    disabled={!canPay}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isRu ? "Оплатить" : "Pay now"}
                  </button>
                  {!canPay && (
                    <p className="mt-2 text-xs text-amber-600">
                      {isRu ? "Недостаточно баланса для оплаты." : "Insufficient balance to pay."}
                    </p>
                  )}
                </form>
              )}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-primary">{isRu ? "Баланс" : "Balance"}</span>
                  <span className="text-lg font-semibold text-primary">{balanceDisplay}</span>
                </div>
              </div>
              {data.trialDaysLeft !== null && (
                <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                  <span>{isRu ? "Пробный период" : "Trial"}</span>
                  <span>
                    {isRu ? "осталось" : ""} {data.trialDaysLeft} {isRu ? "дн." : "days left"}
                  </span>
                </div>
              )}
            </div>
            <form action="/app/settings/billing/top-up" method="get" className="mt-4 flex items-center gap-2">
              <input
                name="amount"
                type="number"
                min={1}
                step="1"
                defaultValue={100}
                className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                {isRu ? "Пополнить" : "Top up"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">{isRu ? "История операций" : "Transactions"}</h4>
          <div className="mt-4 space-y-3">
            {transactions.map((tx: any) => {
              const amount = Number(tx.amount ?? 0);
              const sign = amount >= 0 ? "+" : "-";
              const display = formatCurrency(Math.abs(amount), tx.currency ?? BASE_CURRENCY);
              return (
                <div key={tx.id} className="rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span className="font-semibold">{typeLabel(tx.type)}</span>
                    <span className="font-semibold text-slate-900">{sign}{display}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(tx.createdAt).toLocaleDateString(balanceLocale)} · {tx.comment ?? "—"}
                  </p>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <p className="text-sm text-slate-500">{isRu ? "Операций пока нет." : "No transactions yet."}</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">{isRu ? "Заявки на пополнение" : "Top-up requests"}</h4>
          <div className="mt-4 space-y-3">
            {topups.map((req: any) => {
              const display = formatCurrency(Number(req.amount ?? 0), req.currency ?? BASE_CURRENCY);
              return (
                <div key={req.id} className="rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span className="font-semibold">{methodLabel(req.paymentMethod)}</span>
                    <span className="font-semibold text-slate-900">{display}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {statusLabel(req.status)} · {new Date(req.createdAt).toLocaleDateString(balanceLocale)}
                  </p>
                </div>
              );
            })}
            {topups.length === 0 && (
              <p className="text-sm text-slate-500">{isRu ? "Заявок пока нет." : "No requests yet."}</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
