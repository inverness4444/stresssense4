export const BILLING_MODEL = "per_seat" as const;
export const MIN_SEATS = 10;

// Placeholder values; update anytime without changing UI logic.
export const PRICE_PER_SEAT_RUB = 500;
export const PRICE_PER_SEAT_USD = 8;

export type PricingCurrency = "RUB" | "USD";

export function normalizeSeats(value: number) {
  if (!Number.isFinite(value)) return MIN_SEATS;
  return Math.max(MIN_SEATS, Math.floor(value));
}

export function getPricePerSeat(currency: PricingCurrency) {
  return currency === "USD" ? PRICE_PER_SEAT_USD : PRICE_PER_SEAT_RUB;
}

export function calculateSeatTotal(seats: number, currency: PricingCurrency) {
  const normalizedSeats = normalizeSeats(seats);
  return normalizedSeats * getPricePerSeat(currency);
}

export function resolveCurrency(locale: string): PricingCurrency {
  return locale === "ru" ? "RUB" : "USD";
}

export type IncludedFeatures = { ru: string; en: string };

export const INCLUDED_FEATURES: IncludedFeatures[] = [
  {
    ru: "ИИ-опросы: генерация вопросов под каждого сотрудника на основе истории ответов",
    en: "AI surveys: personalized questions per employee based on answer history",
  },
  {
    ru: "Аналитика стресса и вовлеченности",
    en: "Stress & engagement analytics",
  },
  {
    ru: "Рекомендации по действиям",
    en: "Action recommendations",
  },
  {
    ru: "Драйверы стресса",
    en: "Stress drivers",
  },
  {
    ru: "Анонимные сообщения",
    en: "Anonymous messaging",
  },
  {
    ru: "Поддержка",
    en: "Support",
  },
];
