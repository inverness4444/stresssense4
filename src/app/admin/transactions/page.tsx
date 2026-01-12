import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";

function formatCurrency(value: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

type SearchParams = { q?: string; type?: string; from?: string; to?: string };

export default async function AdminTransactionsPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const query = (searchParams?.q ?? "").trim();
  const type = (searchParams?.type ?? "").trim();
  const from = (searchParams?.from ?? "").trim();
  const to = (searchParams?.to ?? "").trim();

  const where: any = {};
  if (type) where.type = type;
  if (query) {
    where.user = { email: { contains: query, mode: "insensitive" } };
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const transactions = await prisma.walletTransaction.findMany({
    where,
    include: { user: true, createdByAdmin: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const localeKey = isRu ? "ru-RU" : "en-US";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">{isRu ? "Транзакции" : "Transactions"}</h2>
        <p className="text-sm text-slate-600">
          {isRu ? "Прозрачная история операций." : "Transparent ledger of operations."}
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3">
        <input
          name="q"
          defaultValue={query}
          placeholder={isRu ? "Поиск по email" : "Search by email"}
          className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <select name="type" defaultValue={type} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">{isRu ? "Все типы" : "All types"}</option>
          <option value="manual_deposit">manual_deposit</option>
          <option value="manual_withdraw">manual_withdraw</option>
          <option value="adjustment">adjustment</option>
        </select>
        <input
          name="from"
          type="date"
          defaultValue={from}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          name="to"
          type="date"
          defaultValue={to}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
          {isRu ? "Применить" : "Apply"}
        </button>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-[1.1fr_0.6fr_0.7fr_0.9fr_0.8fr] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span>{isRu ? "Пользователь" : "User"}</span>
          <span>{isRu ? "Тип" : "Type"}</span>
          <span>{isRu ? "Сумма" : "Amount"}</span>
          <span>{isRu ? "Комментарий" : "Comment"}</span>
          <span>{isRu ? "Дата" : "Date"}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {transactions.map((tx: any) => {
            const amount = Number(tx.amount ?? 0);
            const sign = amount >= 0 ? "+" : "-";
            const display = formatCurrency(Math.abs(amount), tx.currency ?? "RUB", localeKey);
            return (
              <div key={tx.id} className="grid grid-cols-[1.1fr_0.6fr_0.7fr_0.9fr_0.8fr] gap-3 py-3 text-sm text-slate-700">
                <div>
                  <p className="font-semibold text-slate-900">{tx.user?.email ?? "—"}</p>
                  {tx.createdByAdmin?.email && (
                    <p className="text-xs text-slate-400">{isRu ? "Админ" : "Admin"}: {tx.createdByAdmin.email}</p>
                  )}
                </div>
                <span>{tx.type}</span>
                <span className="font-semibold text-slate-900">{sign}{display}</span>
                <span className="text-xs text-slate-500">{tx.comment ?? "—"}</span>
                <span className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString(localeKey)}</span>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <p className="py-6 text-sm text-slate-500">{isRu ? "Транзакций не найдено." : "No transactions found."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
