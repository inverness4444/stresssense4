import { PRICE_PER_SEAT_RUB, normalizeSeats } from "@/config/pricing";

export type PlanId = "per-seat";

export type PlanConfig = {
  id: PlanId;
  name: string;
  basePrice: number | null;
  includedSeats: number | null;
  extraSeatPrice: number | null;
  legacy?: boolean;
  contactOnly?: boolean;
};

export type PlanPriceBreakdown = {
  basePrice: number;
  includedSeats: number;
  extraSeatPrice: number;
  extraSeats: number;
  extraCost: number;
  total: number;
};

export const DEFAULT_PLAN_ID: PlanId = "per-seat";

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: "per-seat",
    name: "Price per seat",
    basePrice: 0,
    includedSeats: 0,
    extraSeatPrice: PRICE_PER_SEAT_RUB,
  },
];

export const PUBLIC_PLANS = PLAN_CONFIGS.filter((plan) => !plan.legacy);
export const SELECTABLE_PLANS = PUBLIC_PLANS.filter((plan) => !plan.contactOnly);

const PLAN_ALIASES: Record<string, PlanId> = {
  "per-seat": "per-seat",
  "perseat": "per-seat",
  free: "per-seat",
  starter: "per-seat",
  growth: "per-seat",
  scale: "per-seat",
  "enterprise+": "per-seat",
  "enterprise-plus": "per-seat",
  enterpriseplus: "per-seat",
  enterprise: "per-seat",
};

export function getPlanById(planId?: string | null) {
  if (!planId) return null;
  const normalized = planId.trim().toLowerCase().replace(/\s+/g, "-");
  const key = PLAN_ALIASES[normalized];
  if (!key) return null;
  return PLAN_CONFIGS.find((plan) => plan.id === key) ?? null;
}

export function calculatePlanPrice(plan: PlanConfig, activeSeats: number): PlanPriceBreakdown | null {
  if (plan.basePrice == null || plan.extraSeatPrice == null || plan.includedSeats == null) return null;
  const normalizedSeats = normalizeSeats(activeSeats);
  const includedSeats = Math.max(0, Math.floor(plan.includedSeats));
  const extraSeats = Math.max(0, normalizedSeats - includedSeats);
  const extraCost = extraSeats * plan.extraSeatPrice;
  const total = plan.basePrice + extraCost;
  return {
    basePrice: plan.basePrice,
    includedSeats,
    extraSeatPrice: plan.extraSeatPrice,
    extraSeats,
    extraCost,
    total,
  };
}

export function getPlanForSeats(seats: number) {
  normalizeSeats(seats);
  return PLAN_CONFIGS[0];
}
