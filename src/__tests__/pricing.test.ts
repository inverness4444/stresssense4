import { describe, it, expect } from "vitest";
import { calculatePlanPrice, getPlanById } from "@/lib/pricingTiers";
import { MIN_SEATS, PRICE_PER_SEAT_RUB } from "@/config/pricing";

describe("plan pricing", () => {
  it("maps legacy plans to per-seat pricing", () => {
    const plan = getPlanById("starter");
    if (!plan) throw new Error("Per-seat plan missing");
    const pricing = calculatePlanPrice(plan, 5);
    expect(pricing?.extraSeats).toBe(MIN_SEATS);
    expect(pricing?.total).toBe(MIN_SEATS * PRICE_PER_SEAT_RUB);
  });

  it("calculates per-seat total for larger seat counts", () => {
    const plan = getPlanById("per-seat");
    if (!plan) throw new Error("Per-seat plan missing");
    const pricing = calculatePlanPrice(plan, 25);
    expect(pricing?.extraSeats).toBe(25);
    expect(pricing?.total).toBe(25 * PRICE_PER_SEAT_RUB);
  });
});
