"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { formatMoney } from "@/lib/formatMoney";
import { MIN_SEATS, calculateSeatTotal, getPricePerSeat, normalizeSeats, resolveCurrency } from "@/config/pricing";

type Props = {
  locale: Locale;
  defaultSeats: number;
  inputName?: string;
  title: string;
  description?: string;
  cta?: React.ReactNode;
  minSeatsHint: string;
  seatsLabel: string;
  totalLabel: string;
  perSeatLabel: string;
  showTotal?: boolean;
  showHeader?: boolean;
  variant?: "card" | "plain";
};

export function SeatPricingSelector({
  locale,
  defaultSeats,
  inputName = "seats",
  title,
  description,
  cta,
  minSeatsHint,
  seatsLabel,
  totalLabel,
  perSeatLabel,
  showTotal = true,
  showHeader = true,
  variant = "card",
}: Props) {
  const currency = resolveCurrency(locale);
  const minSeats = MIN_SEATS;
  const normalizedDefault = normalizeSeats(defaultSeats);
  const [rawSeats, setRawSeats] = useState(String(normalizedDefault));
  const [showMinHint, setShowMinHint] = useState(false);

  const parsedSeats = useMemo(() => {
    const value = Number.parseInt(rawSeats, 10);
    return Number.isFinite(value) ? value : Number.NaN;
  }, [rawSeats]);

  const normalizedSeats = useMemo(() => normalizeSeats(parsedSeats), [parsedSeats]);
  const pricePerSeat = useMemo(() => getPricePerSeat(currency), [currency]);
  const total = useMemo(() => calculateSeatTotal(normalizedSeats, currency), [normalizedSeats, currency]);
  const currencySuffix = locale === "ru" ? " / мес" : " / mo";

  const handleChange = (value: string) => {
    setRawSeats(value);
    const numeric = Number.parseInt(value, 10);
    setShowMinHint(Number.isFinite(numeric) && numeric < minSeats);
  };

  const handleBlur = () => {
    const numeric = Number.parseInt(rawSeats, 10);
    const next = Number.isFinite(numeric) ? normalizeSeats(numeric) : normalizedDefault;
    setRawSeats(String(next));
    setShowMinHint(Number.isFinite(numeric) && numeric < minSeats);
  };

  return (
    <div
      className={
        variant === "plain"
          ? "rounded-3xl border-0 bg-transparent p-0 shadow-none"
          : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      }
    >
      {showHeader && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{title}</p>
          {description && <p className="text-sm text-slate-600">{description}</p>}
        </div>
      )}

      <div
        className={`${showHeader ? "mt-6" : "mt-0"} grid gap-4 md:items-end ${
          showTotal ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-1"
        }`}
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{seatsLabel}</label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              min={minSeats}
              value={rawSeats}
              onChange={(event) => handleChange(event.target.value)}
              onBlur={handleBlur}
              className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900"
            />
            <input type="hidden" name={inputName} value={normalizedSeats} />
            <span className="text-sm text-slate-500">
              {formatMoney(pricePerSeat, locale, currency)}
              {currencySuffix}
              <span className="ml-1 text-xs text-slate-400">{perSeatLabel}</span>
            </span>
          </div>
          {showMinHint && (
            <p className="mt-2 text-xs font-semibold text-amber-600">{minSeatsHint}</p>
          )}
        </div>

        {showTotal && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{totalLabel}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatMoney(total, locale, currency)}
              <span className="text-sm font-semibold text-slate-500">{currencySuffix}</span>
            </p>
          </div>
        )}
      </div>

      {cta && <div className="mt-6">{cta}</div>}
    </div>
  );
}
