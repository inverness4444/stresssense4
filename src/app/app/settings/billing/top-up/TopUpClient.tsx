"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createTopUpRequest } from "./actions";
import type { TopUpFormState } from "./actions";

type TopUpClientProps = {
  initialAmount: number;
  isRu: boolean;
};

export default function TopUpClient({ initialAmount, isRu }: TopUpClientProps) {
  const usdToRub = 100;
  const [amountInput, setAmountInput] = useState<number>(initialAmount);
  const [network, setNetwork] = useState<"ERC20" | "TRC20">("ERC20");
  const [formState, formAction] = useActionState<TopUpFormState>(createTopUpRequest, { status: "idle" });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setAmountInput(initialAmount);
  }, [initialAmount]);

  const { amountDisplay, amountHint, title, subtitle, amountLabel } = useMemo(() => {
    const safeAmount = Number.isFinite(amountInput) && amountInput > 0 ? amountInput : 0;
    const amountUsd = isRu ? safeAmount / usdToRub : safeAmount;
    const display = isRu
      ? `${Math.round(amountUsd * usdToRub).toLocaleString("ru-RU")} ₽`
      : `$${amountUsd.toFixed(2)}`;
    return {
      amountDisplay: display,
      title: isRu ? "Пополнение" : "Top up",
      subtitle: isRu
        ? "Выберите способ оплаты и используйте реквизиты ниже."
        : "Choose a payment method and use the details below.",
      amountLabel: isRu ? "Сумма пополнения" : "Top-up amount",
      amountHint: isRu ? "Сумма в рублях" : "Amount in USD",
    };
  }, [amountInput, isRu]);

  const amountUsd = Number.isFinite(amountInput) && amountInput > 0 ? (isRu ? amountInput / usdToRub : amountInput) : 0;
  const isAmountValid = amountUsd > 0;
  const methodLabel =
    formState.method === "crypto"
      ? isRu
        ? "криптовалюте"
        : "crypto"
      : formState.method === "sbp"
        ? isRu
          ? "СБП"
          : "SBP"
        : formState.method === "invoice"
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">{subtitle}</p>
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">{isRu ? "Криптовалюта (USDT)" : "Crypto (USDT)"}</p>
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
              value={
                network === "ERC20"
                  ? "0x7628267db0cba86297910fd75d91cf4f0bf2c5bb"
                  : "TU22xAVauNPds3PxakjV97BJySJ8pKm1yG"
              }
              mono
            />
            <DetailRow id="crypto-memo" label={isRu ? "Комментарий" : "Memo"} value="—" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {isRu ? "После оплаты нажмите «Я оплатил»." : "After payment, click “I paid”."}
          </p>
          <form action={formAction}>
            <input type="hidden" name="amountUsd" value={amountUsd.toFixed(2)} />
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

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">{isRu ? "Оплата через СБП" : "SBP transfer"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {isRu ? "Реквизиты СБП добавим после получения данных." : "SBP details will be added once provided."}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <DetailRow id="sbp-recipient" label={isRu ? "Получатель" : "Recipient"} value="—" />
            <DetailRow id="sbp-bank" label={isRu ? "Банк" : "Bank"} value="—" />
            <DetailRow id="sbp-phone" label={isRu ? "Телефон" : "Phone"} value="—" />
            <DetailRow id="sbp-purpose" label={isRu ? "Назначение платежа" : "Payment purpose"} value="—" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {isRu ? "Поддержим автосверку после оплаты." : "Auto-reconciliation will be available after payment."}
          </p>
          <form action={formAction}>
            <input type="hidden" name="amountUsd" value={amountUsd.toFixed(2)} />
            <input type="hidden" name="method" value="sbp" />
            <button
              disabled={!isAmountValid}
              className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isRu ? "Я оплатил" : "I paid"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            {isRu ? "Официальный счет с чеком" : "Official invoice & receipt"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isRu
              ? "Подготовим официальный счет и чек для бухгалтерии."
              : "We will prepare an official invoice and receipt."}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <DetailRow id="invoice-recipient" label={isRu ? "Реквизиты получателя" : "Recipient details"} value="—" />
            <DetailRow id="invoice-email" label={isRu ? "Email для счета" : "Invoice email"} value="—" />
            <DetailRow id="invoice-amount" label={isRu ? "Сумма" : "Amount"} value={amountDisplay} />
          </div>
          <form action={formAction}>
            <input type="hidden" name="amountUsd" value={amountUsd.toFixed(2)} />
            <input type="hidden" name="method" value="invoice" />
            <button
              disabled={!isAmountValid}
              className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isRu ? "Запросить счет" : "Request invoice"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
