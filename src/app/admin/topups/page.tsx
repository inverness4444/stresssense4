import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { approveTopupRequest, rejectTopupRequest } from "../actions";

function formatCurrency(value: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

type SearchParams = { q?: string; status?: string; method?: string };

export default async function AdminTopupsPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const query = (searchParams?.q ?? "").trim();
  const status = (searchParams?.status ?? "").trim().toLowerCase();
  const method = (searchParams?.method ?? "").trim().toLowerCase();

  const where: any = {};
  if (status) where.status = status;
  if (method) where.paymentMethod = method;
  if (query) {
    where.user = { email: { contains: query, mode: "insensitive" } };
  }

  const requests = await prisma.topupRequest.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const localeKey = isRu ? "ru-RU" : "en-US";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">{isRu ? "Заявки на пополнение" : "Top-up requests"}</h2>
        <p className="text-sm text-slate-600">
          {isRu ? "Ручное подтверждение пополнений." : "Manual approval for top-ups."}
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3">
        <input
          name="q"
          defaultValue={query}
          placeholder={isRu ? "Поиск по email" : "Search by email"}
          className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">{isRu ? "Все статусы" : "All statuses"}</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
        <select name="method" defaultValue={method} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">{isRu ? "Все методы" : "All methods"}</option>
          <option value="sbp">sbp</option>
          <option value="card">card</option>
          <option value="crypto">crypto</option>
          <option value="other">other</option>
        </select>
        <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
          {isRu ? "Применить" : "Apply"}
        </button>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-[1.1fr_0.7fr_0.5fr_0.7fr_0.8fr] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span>{isRu ? "Пользователь" : "User"}</span>
          <span>{isRu ? "Сумма" : "Amount"}</span>
          <span>{isRu ? "Метод" : "Method"}</span>
          <span>{isRu ? "Статус" : "Status"}</span>
          <span>{isRu ? "Действия" : "Actions"}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {requests.map((req: any) => (
            <div key={req.id} className="grid grid-cols-[1.1fr_0.7fr_0.5fr_0.7fr_0.8fr] gap-3 py-3 text-sm text-slate-700">
              <div>
                <Link href={`/admin/topups/${req.id}`} className="font-semibold text-slate-900 hover:underline">
                  {req.user?.email ?? "—"}
                </Link>
                <p className="text-xs text-slate-500">{req.id.slice(0, 8)}</p>
              </div>
              <span>{formatCurrency(Number(req.amount ?? 0), req.currency ?? "RUB", localeKey)}</span>
              <span>{req.paymentMethod}</span>
              <span>{req.status}</span>
              <div className="flex flex-wrap gap-2">
                {req.status === "pending" ? (
                  <>
                    <form action={approveTopupRequest}>
                      <input type="hidden" name="requestId" value={req.id} />
                      <button className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                        {isRu ? "Подтвердить" : "Approve"}
                      </button>
                    </form>
                    <form action={rejectTopupRequest}>
                      <input type="hidden" name="requestId" value={req.id} />
                      <button className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
                        {isRu ? "Отклонить" : "Reject"}
                      </button>
                    </form>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">{isRu ? "Обработано" : "Processed"}</span>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="py-6 text-sm text-slate-500">{isRu ? "Заявок не найдено." : "No requests found."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
