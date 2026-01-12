import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getLocale } from "@/lib/i18n-server";
import { getBillingOverview } from "@/lib/billingOverview";
import { updateSubscriptionSeats } from "../actions";
import { SeatPricingSelector } from "@/components/pricing/SeatPricingSelector";
import { INCLUDED_FEATURES, MIN_SEATS, calculateSeatTotal, getPricePerSeat, resolveCurrency } from "@/config/pricing";
import { formatMoney } from "@/lib/formatMoney";

export default async function BillingSubscriptionsPage() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const orgId = user.organizationId;
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  const role = (user.role ?? "").toUpperCase();
  if (!enabled || !["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) redirect("/app/overview");

  const data = await getBillingOverview(orgId, user.id);
  const pendingSeats = typeof data.pendingSeats === "number" ? data.pendingSeats : null;
  const currentSeatsRaw = typeof data.seatsConfigured === "number" ? data.seatsConfigured : data.seatsUsed;
  const currentSeats = Math.max(currentSeatsRaw, MIN_SEATS);
  const seatsForPricing = pendingSeats ?? currentSeats;
  const currency = resolveCurrency(locale);
  const pricePerSeat = getPricePerSeat(currency);
  const monthlyTotal = calculateSeatTotal(seatsForPricing, currency);
  const formatPrice = (value: number) => formatMoney(value, locale, currency);

  async function changeSeats(formData: FormData) {
    "use server";
    const seats = Number(formData.get("seats") ?? "0");
    if (Number.isFinite(seats) && seats > 0) {
      await updateSubscriptionSeats(orgId, seats);
    }
  }

  const includedItems = INCLUDED_FEATURES.map((f) => (isRu ? f.ru : f.en));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">{isRu ? "Подписка" : "Subscription"}</h2>
          <p className="text-sm text-slate-600">
            {isRu ? "Цена за место и итоговая стоимость." : "Per-seat pricing with a clear monthly total."}
          </p>
        </div>
        <Link
          href="/app/settings/billing"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {isRu ? "Назад в биллинг" : "Back to billing"}
        </Link>
      </div>

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
          cta={
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
              {isRu ? "Обновить места" : "Update seats"}
            </button>
          }
        />
      </form>
      {pendingSeats != null && (
        <p className="text-xs text-amber-600">
          {isRu ? "Изменение вступит в силу после оплаты." : "Changes apply after payment."}
        </p>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {isRu ? "Что входит" : "What's included"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {isRu ? "Единый пакет возможностей StressSense." : "Everything you need with StressSense."}
            </p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <div>
              {isRu ? "Мест" : "Seats"}: <span className="font-semibold text-slate-900">{seatsForPricing}</span>
            </div>
            <div>
              {isRu ? "Цена за место" : "Price per seat"}:{" "}
              <span className="font-semibold text-slate-900">
                {formatPrice(pricePerSeat)} {isRu ? "/ мес" : "/ mo"}
              </span>
            </div>
            <div>
              {isRu ? "Итого" : "Total"}:{" "}
              <span className="font-semibold text-slate-900">
                {formatPrice(monthlyTotal)} {isRu ? " / мес" : " / mo"}
              </span>
            </div>
          </div>
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {includedItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
