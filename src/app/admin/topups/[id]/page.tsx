import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { approveTopupRequest, rejectTopupRequest } from "../../actions";

function formatCurrency(value: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

type Props = { params: { id: string } };

export default async function AdminTopupDetailPage({ params }: Props) {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const localeKey = isRu ? "ru-RU" : "en-US";

  const request = await prisma.topupRequest.findUnique({
    where: { id: params.id },
    include: { user: true, processedByAdmin: true },
  });

  if (!request) notFound();

  const amountDisplay = formatCurrency(Number(request.amount ?? 0), request.currency ?? "RUB", localeKey);
  const details = request.details && typeof request.details === "object" ? request.details : null;
  const canProcess = request.status === "pending";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">{isRu ? "Заявка" : "Top-up request"}</h2>
        <p className="text-sm text-slate-500">{request.id}</p>

        <div className="mt-4 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isRu ? "Пользователь" : "User"}</p>
            <p className="font-semibold text-slate-900">{request.user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isRu ? "Сумма" : "Amount"}</p>
            <p className="font-semibold text-slate-900">{amountDisplay}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isRu ? "Метод" : "Method"}</p>
            <p className="font-semibold text-slate-900">{request.paymentMethod}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isRu ? "Статус" : "Status"}</p>
            <p className="font-semibold text-slate-900">{request.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isRu ? "Создано" : "Created"}</p>
            <p className="text-xs text-slate-500">{new Date(request.createdAt).toLocaleDateString(localeKey)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isRu ? "Обработано" : "Processed"}</p>
            <p className="text-xs text-slate-500">
              {request.processedAt ? new Date(request.processedAt).toLocaleDateString(localeKey) : "—"}
            </p>
          </div>
        </div>

        {details && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{isRu ? "Детали" : "Details"}</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{JSON.stringify(details, null, 2)}</pre>
          </div>
        )}

        {request.processedByAdmin?.email && (
          <p className="mt-3 text-xs text-slate-500">
            {isRu ? "Администратор" : "Admin"}: {request.processedByAdmin.email}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {canProcess ? (
            <>
              <form action={approveTopupRequest}>
                <input type="hidden" name="requestId" value={request.id} />
                <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
                  {isRu ? "Подтвердить" : "Approve"}
                </button>
              </form>
              <form action={rejectTopupRequest}>
                <input type="hidden" name="requestId" value={request.id} />
                <button className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">
                  {isRu ? "Отклонить" : "Reject"}
                </button>
              </form>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              {isRu ? "Заявка уже обработана." : "This request has already been processed."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
