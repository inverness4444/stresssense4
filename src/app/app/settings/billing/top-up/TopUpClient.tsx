"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createTopUpRequest } from "./actions";
import { BASE_CURRENCY, PAYMENT_DETAILS } from "@/config/payments";
import type { TopUpFormState } from "./actions";
import { YooKassaPayButton } from "@/components/billing/YooKassaPayButton";

type TopUpClientProps = {
  initialAmount: number;
  isRu: boolean;
};

export default function TopUpClient({ initialAmount, isRu }: TopUpClientProps) {
  const [amountInput, setAmountInput] = useState<number>(initialAmount);
  const [method, setMethod] = useState<"card" | "crypto">("card");
  const [network, setNetwork] = useState<"ERC20" | "TRC20">("ERC20");
  const [formState, formAction] = useActionState<TopUpFormState>(createTopUpRequest, { status: "idle" });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setAmountInput(initialAmount);
  }, [initialAmount]);

  const paymentCurrency = method === "card" ? BASE_CURRENCY : "USDT";

  const { amountDisplay, amountHint, title, subtitle, amountLabel } = useMemo(() => {
    const safeAmount = Number.isFinite(amountInput) && amountInput > 0 ? amountInput : 0;
    const display = (() => {
      try {
        return new Intl.NumberFormat(isRu ? "ru-RU" : "en-US", {
          style: "currency",
          currency: paymentCurrency,
        }).format(safeAmount);
      } catch {
        return `${safeAmount.toFixed(2)} ${paymentCurrency}`;
      }
    })();
    return {
      amountDisplay: display,
      title: isRu ? "Пополнение" : "Top up",
      subtitle: isRu
        ? "Выберите способ оплаты и используйте реквизиты ниже."
        : "Choose a payment method and use the details below.",
      amountLabel: isRu ? "Сумма пополнения" : "Top-up amount",
      amountHint:
        method === "card"
          ? isRu
            ? "Сумма в рублях (RUB)"
            : `Amount in ${BASE_CURRENCY}`
          : isRu
            ? "Сумма в долларах (USDT)"
            : `Amount in ${paymentCurrency}`,
    };
  }, [amountInput, isRu, method, paymentCurrency]);

  const amountValue = Number.isFinite(amountInput) && amountInput > 0 ? amountInput : 0;
  const isAmountValid = amountValue > 0;
  const methodLabel =
    formState.method === "crypto"
      ? isRu
        ? "криптовалюте"
        : "crypto"
      : formState.method === "sbp"
        ? isRu
          ? "СБП"
          : "SBP"
        : formState.method === "other"
          ? isRu
            ? "счету"
            : "invoice"
          : null;
  const statusMessage =
    formState.status === "ok"
      ? isRu
        ? `Заявка на пополнение по ${methodLabel ?? "оплате"} отправлена. Мы подтвердим поступление.`
        : `Top-up request via ${methodLabel ?? "payment"} sent. We will confirm once received.`
      : formState.status === "error"
        ? isRu
          ? "Не удалось отправить заявку. Проверьте сумму и попробуйте снова."
          : "Could not send request. Check the amount and try again."
        : null;

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

  const DetailRow = ({
    id,
    label,
    value,
    mono,
  }: {
    id: string;
    label: string;
    value: string;
    mono?: boolean;
  }) => {
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

  const handleAmountChange = (value: string) => {
    const parsed = Number(value);
    setAmountInput(Number.isFinite(parsed) ? parsed : 0);
  };

  const methodTabLabel = (value: "card" | "crypto") =>
    value === "card" ? (isRu ? "Карта" : "Card") : isRu ? "Крипто" : "Crypto";
  const payLabel = isRu ? "Оплатить картой" : "Pay by card";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">{subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["card", "crypto"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMethod(item)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                  method === item
                    ? "bg-primary text-white ring-primary/30"
                    : "bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200"
                }`}
              >
                {methodTabLabel(item)}
              </button>
            ))}
          </div>
        </div>
        <Link
          href="/app/settings/billing"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {isRu ? "Назад к биллингу" : "Back to billing"}
        </Link>
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">{amountLabel}</p>
            <p className="text-2xl font-semibold text-slate-900">{amountDisplay}</p>
            <p className="text-xs text-slate-500">{amountHint}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              name="amount"
              type="number"
              min={1}
              step="1"
              value={amountInput || ""}
              onChange={(event) => handleAmountChange(event.target.value)}
              className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <span className="text-xs text-slate-500">{isRu ? "Изменить" : "Edit"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {method === "card" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{isRu ? "Оплата картой (YooKassa)" : "Card payment (YooKassa)"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {isRu ? "После нажатия вы будете перенаправлены на оплату." : "You will be redirected to complete payment."}
            </p>
            <div className="mt-4">
              <YooKassaPayButton
                endpoint="/api/billing/top-up/create-payment"
                payload={{ amount: amountValue }}
                label={payLabel}
                disabled={!isAmountValid}
                className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-500"
              />
            </div>
          </div>
        )}

        {method === "crypto" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{isRu ? "Криптовалюта (только USDT)" : "Crypto (USDT only)"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {isRu ? "Только USDT. Реквизиты добавим позже." : "USDT only. Details will be added later."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["ERC20", "TRC20"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setNetwork(item)}
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
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <DetailRow id="crypto-network" label={isRu ? "Сеть" : "Network"} value={network} />
              <DetailRow
                id="crypto-address"
                label={isRu ? "Адрес USDT" : "USDT address"}
                value={PAYMENT_DETAILS.crypto.networks[network]}
                mono
              />
              <DetailRow id="crypto-memo" label={isRu ? "Комментарий" : "Memo"} value="—" />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {isRu ? "После оплаты нажмите «Я оплатил»." : "After payment, click “I paid”."}
            </p>
            <form action={formAction}>
              <input type="hidden" name="amount" value={amountValue.toFixed(2)} />
              <input type="hidden" name="method" value="crypto" />
              <input type="hidden" name="network" value={network} />
              <button
                disabled={!isAmountValid}
                className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-500"
              >
                {isRu ? "Я оплатил" : "I paid"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
