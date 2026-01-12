import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { BASE_CURRENCY } from "@/config/payments";
import { updateUserRole, adjustUserBalance } from "../../actions";
import { getRoleLabel } from "@/lib/roles";

function formatCurrency(value: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

type Props = { params: { id: string } };

export default async function AdminUserDetailPage({ params }: Props) {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const balanceLocale = isRu ? "ru-RU" : "en-US";
  const userId = typeof params?.id === "string" ? params.id : "";
  if (!userId) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) notFound();
  if ((user.role ?? "").toUpperCase() === "SUPER_ADMIN") notFound();

  let walletTransactions: any[] = [];
  try {
    walletTransactions =
      (await prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { createdByAdmin: true },
      })) ?? [];
  } catch {
    walletTransactions = [];
  }

  const isSuperAdmin = (user.role ?? "").toUpperCase() === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">{user.name}</h2>
        <p className="text-sm text-slate-500">{user.email}</p>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Role</p>
            <p className="font-semibold text-slate-900">{getRoleLabel(user.role, locale)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isRu ? "Баланс" : "Balance"}</p>
            <p className="font-semibold text-slate-900">
              {formatCurrency(Number(user.balance ?? 0), BASE_CURRENCY, balanceLocale)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">ID</p>
            <p className="text-xs text-slate-500 break-all">{user.id}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isRu ? "Создан" : "Created"}</p>
            <p className="text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString(balanceLocale)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{isRu ? "Изменить роль" : "Change role"}</h3>
          <form action={updateUserRole} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="userId" value={user.id} />
            <select
              name="role"
              defaultValue={user.role ?? ""}
              disabled={isSuperAdmin}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="HR">{getRoleLabel("HR", locale)}</option>
              <option value="ADMIN">{getRoleLabel("ADMIN", locale)}</option>
              <option value="MANAGER">{getRoleLabel("MANAGER", locale)}</option>
              <option value="EMPLOYEE">{getRoleLabel("EMPLOYEE", locale)}</option>
            </select>
            <button
              disabled={isSuperAdmin}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isRu ? "Сохранить" : "Save"}
            </button>
            {isSuperAdmin && (
              <p className="text-xs text-amber-600">
                {isRu ? "Роль супер-админа менять нельзя." : "Super admin role cannot be changed."}
              </p>
            )}
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{isRu ? "Ручное изменение баланса" : "Manual balance"}</h3>
          <form action={adjustUserBalance} className="mt-4 space-y-3">
            <input type="hidden" name="userId" value={user.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="amount"
                type="number"
                step="0.01"
                placeholder={isRu ? "Сумма" : "Amount"}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <select name="type" className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="manual_deposit">{isRu ? "Пополнение" : "Deposit"}</option>
                <option value="manual_withdraw">{isRu ? "Списание" : "Withdraw"}</option>
                <option value="adjustment">{isRu ? "Коррекция" : "Adjustment"}</option>
              </select>
            </div>
            <input
              name="comment"
              type="text"
              placeholder={isRu ? "Комментарий" : "Comment"}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              {isRu ? "Применить" : "Apply"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{isRu ? "История транзакций" : "Transaction history"}</h3>
        <div className="mt-4 space-y-3">
          {walletTransactions.map((tx: any) => {
            const amount = Number(tx.amount ?? 0);
            const sign = amount >= 0 ? "+" : "-";
            const display = formatCurrency(Math.abs(amount), tx.currency ?? BASE_CURRENCY, balanceLocale);
            return (
              <div key={tx.id} className="rounded-2xl border border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="font-semibold">{tx.type}</span>
                  <span className="font-semibold text-slate-900">{sign}{display}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(tx.createdAt).toLocaleDateString(balanceLocale)} · {tx.comment ?? "—"}
                </p>
                {tx.createdByAdmin?.email && (
                  <p className="text-xs text-slate-400">{isRu ? "Админ" : "Admin"}: {tx.createdByAdmin.email}</p>
                )}
              </div>
            );
          })}
          {walletTransactions.length === 0 && (
            <p className="text-sm text-slate-500">{isRu ? "Транзакций пока нет." : "No transactions yet."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
