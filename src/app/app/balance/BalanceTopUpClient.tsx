"use client";

import { useActionState, useMemo, useState } from "react";
import { createTopupRequest, type TopupFormState } from "./actions";
import { BASE_CURRENCY, PAYMENT_DETAILS, PAYMENT_METHODS, type PaymentMethod } from "@/config/payments";

type BalanceTopUpClientProps = {
  locale: "ru" | "en";
  initialAmount?: number;
};

export default function BalanceTopUpClient({ locale, initialAmount = 1000 }: BalanceTopUpClientProps) {
  const isRu = locale === "ru";
  const [amount, setAmount] = useState<number>(initialAmount);
  const [method, setMethod] = useState<PaymentMethod>("sbp");
  const [network, setNetwork] = useState<"ERC20" | "TRC20">("ERC20");
  const [comment, setComment] = useState<string>("");
  const [formState, formAction] = useActionState<TopupFormState>(createTopupRequest, { status: "idle" });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const statusMessage = useMemo(() => {
    if (formState.status === "ok") {
      return isRu
        ? "Заявка отправлена. После проверки администратор вручную зачислит баланс в течение 24 часов."
        : "Request sent. The admin will manually credit your balance within 24 hours.";
    }
    if (formState.status === "error") {
      return isRu ? "Не удалось отправить заявку. Проверьте данные." : "Could not submit the request. Check the details.";
    }
    return null;
  }, [formState.status, isRu]);

  const amountLabel = isRu ? "Сумма пополнения" : "Top-up amount";
  const commentLabel = isRu ? "Комментарий (опционально)" : "Comment (optional)";
  const submitLabel = isRu ? "Отправить заявку" : "Submit request";
  const currencyLabel = method === "crypto" ? "USDT" : BASE_CURRENCY;

  const copyLabel = isRu ? "Скопировать" : "Copy";
  const copiedLabel = isRu ? "Скопировано" : "Copied";
  const handleCopy = async (id: string, value: string) => {
    if (!value || value === "—") return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const DetailRow = ({ id, label, value, mono }: { id: string; label: string; value: string; mono?: boolean }) => {
    const isEmpty = !value || value === "—";
    return (
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <div className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <span className={`flex-1 break-all ${mono ? "font-mono text-xs" : "text-sm text-slate-700"}`}>{value}</span>
          <button
            type="button"
            disabled={isEmpty}
            onClick={() => handleCopy(id, value)}
            className="shrink-0 text-xs font-semibold text-primary disabled:text-slate-400"
          >
            {copiedId === id ? copiedLabel : copyLabel}
          </button>
        </div>
      </div>
    );
  };

  const methodLabels: Record<PaymentMethod, string> = {
    sbp: isRu ? "СБП" : "SBP",
    card: isRu ? "Карта" : "Card",
    crypto: isRu ? "Криптовалюта (USDT)" : "Crypto (USDT)",
    other: isRu ? "Другое" : "Other",
  };
  const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: methodLabels[m] }));

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">{isRu ? "Пополнение баланса" : "Top up balance"}</h3>
        <p className="text-sm text-slate-600">
          {isRu
            ? "После перевода денег администратор вручную зачислит баланс."
            : "After transferring funds, the admin will manually credit your balance."}
        </p>
      </div>

      {statusMessage && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            formState.status === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {statusMessage}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold">{amountLabel}</span>
            <div className="flex items-center gap-2">
              <input
                name="amount"
                type="number"
                min={1}
                step="1"
                value={Number.isFinite(amount) ? amount : ""}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <span className="text-xs text-slate-500">{currencyLabel}</span>
            </div>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold">{isRu ? "Способ оплаты" : "Payment method"}</span>
            <select
              name="method"
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {methodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {method === "crypto" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {["ERC20", "TRC20"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setNetwork(item as "ERC20" | "TRC20")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                    network === item
                      ? "bg-primary text-white ring-primary/30"
                      : "bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <DetailRow id="crypto-network" label={isRu ? "Сеть" : "Network"} value={network} />
            <DetailRow
              id="crypto-address"
              label={isRu ? "Адрес USDT" : "USDT address"}
              value={PAYMENT_DETAILS.crypto.networks[network]}
              mono
            />
            <input type="hidden" name="network" value={network} />
          </div>
        )}

        {method === "sbp" && (
          <div className="space-y-2">
            <DetailRow id="sbp-recipient" label={isRu ? "Получатель" : "Recipient"} value={PAYMENT_DETAILS.sbp.recipient} />
            <DetailRow id="sbp-bank" label={isRu ? "Банк" : "Bank"} value={PAYMENT_DETAILS.sbp.bank} />
            <DetailRow id="sbp-phone" label={isRu ? "Телефон" : "Phone"} value={PAYMENT_DETAILS.sbp.phone} />
            <DetailRow id="sbp-purpose" label={isRu ? "Назначение" : "Payment purpose"} value={PAYMENT_DETAILS.sbp.purpose} />
          </div>
        )}

        {method === "card" && (
          <div className="space-y-2">
            <DetailRow id="card-recipient" label={isRu ? "Получатель" : "Recipient"} value={PAYMENT_DETAILS.card.recipient} />
            <DetailRow id="card-bank" label={isRu ? "Банк" : "Bank"} value={PAYMENT_DETAILS.card.bank} />
            <DetailRow id="card-last4" label={isRu ? "Последние 4 цифры" : "Last 4 digits"} value={PAYMENT_DETAILS.card.cardLast4} />
          </div>
        )}

        {method === "other" && (
          <DetailRow id="other-notes" label={isRu ? "Комментарий" : "Notes"} value={PAYMENT_DETAILS.other.notes} />
        )}

        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-semibold">{commentLabel}</span>
          <input
            name="comment"
            type="text"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder={isRu ? "Например: перевод через СБП" : "For example: SBP transfer"}
          />
        </label>

        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
