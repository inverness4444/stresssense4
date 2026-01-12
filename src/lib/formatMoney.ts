import { BASE_CURRENCY } from "@/config/payments";

const RUB_TO_USD_RATE = 100;

export const getLocaleKey = (locale: string) => (locale === "ru" ? "ru-RU" : "en-US");

type MoneyFormatOptions = Intl.NumberFormatOptions;

function normalizeCurrencyForLocale(value: number, currency: string, locale: string) {
  const normalized = String(currency || BASE_CURRENCY).toUpperCase();
  if (locale !== "ru" && normalized === "RUB") {
    return { value: value / RUB_TO_USD_RATE, currency: "USD" };
  }
  return { value, currency: normalized };
}

export function formatMoney(
  value: number,
  locale: string,
  currency: string = BASE_CURRENCY,
  options: MoneyFormatOptions = {}
) {
  const localeKey = getLocaleKey(locale);
  const { value: displayValue, currency: displayCurrency } = normalizeCurrencyForLocale(value, currency, locale);
  const formatOptions: MoneyFormatOptions = {
    style: "currency",
    currency: displayCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  };

  try {
    return new Intl.NumberFormat(localeKey, formatOptions).format(displayValue);
  } catch {
    const digits = typeof formatOptions.maximumFractionDigits === "number" ? formatOptions.maximumFractionDigits : 2;
    if (digits === 0) {
      return `${Math.round(displayValue)} ${displayCurrency}`;
    }
    return `${displayValue.toFixed(digits)} ${displayCurrency}`;
  }
}
