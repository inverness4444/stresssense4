import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getBillingOverview } from "@/lib/billingOverview";
import { applyPromoCode, generateReferralCode, updateSubscriptionSeats } from "./actions";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  const orgId = user!.organizationId;
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user!.id });
  if (!enabled || (user!.role !== "ADMIN" && user!.role !== "HR")) redirect("/app/overview");

  const data = await getBillingOverview(orgId);
  const subscription = data.subscription;
  const plan = data.plan;

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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">Billing & plans</h2>
        <p className="text-sm text-slate-600">Управление тарифом, местами и промокодами.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Текущий план</h3>
          <p className="text-sm text-slate-600">{plan?.name ?? "Не выбран"} · {subscription?.status}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-800">
            <p>Цена: ${(plan?.monthlyPriceCents ?? 0) / 100} / мес</p>
            <p>Мест: {subscription?.seats ?? "—"} (используется {data.seatsUsed})</p>
            {data.trialDaysLeft !== null && <p>Trial: осталось {data.trialDaysLeft} дн.</p>}
          </div>
          <form action={changeSeats} className="mt-4 flex items-center gap-2">
            <input
              name="seats"
              type="number"
              min={data.seatsUsed}
              defaultValue={subscription?.seats ?? data.seatsUsed}
              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
              Обновить места
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Промокод</h3>
          <form action={applyPromo} className="mt-3 flex gap-2">
            <input
              name="code"
              placeholder="PROMO2025"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
              Применить
            </button>
          </form>
          <p className="mt-4 text-sm font-semibold text-slate-900">Referral</p>
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
                <p>${(inv.amountCents ?? 0) / 100}</p>
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
