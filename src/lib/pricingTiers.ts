export type PricingTier = {
  key: string;
  label: string;
  maxSeats: number | null;
  priceUsd: number;
};

export const PRICING_TIERS: PricingTier[] = [
  { key: "free", label: "Free", maxSeats: 20, priceUsd: 0 },
  { key: "starter", label: "Starter", maxSeats: 50, priceUsd: 99 },
  { key: "growth", label: "Growth", maxSeats: 200, priceUsd: 299 },
  { key: "scale", label: "Scale", maxSeats: 1999, priceUsd: 899 },
  { key: "enterprise-plus", label: "Enterprise+", maxSeats: null, priceUsd: 2000 },
];

export function getTierForSeats(seats: number) {
  const normalizedSeats = Math.max(0, Math.floor(seats));
  for (const tier of PRICING_TIERS) {
    if (tier.maxSeats == null || normalizedSeats <= tier.maxSeats) {
      return tier;
    }
  }
  return PRICING_TIERS[PRICING_TIERS.length - 1];
}
