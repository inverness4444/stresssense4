import { describe, it, expect } from "vitest";
import { computeBillingGateStatus } from "@/lib/billingGate";

describe("billing gate", () => {
  it("allows access during trial without payment", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-03T00:00:00.000Z");
    const status = computeBillingGateStatus({ organizationCreatedAt: createdAt, now });
    expect(status.trialActive).toBe(true);
    expect(status.hasPaidAccess).toBe(false);
    expect(status.blocked).toBe(false);
  });

  it("blocks after trial when unpaid", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-10T00:00:00.000Z");
    const status = computeBillingGateStatus({ organizationCreatedAt: createdAt, now });
    expect(status.trialActive).toBe(false);
    expect(status.hasPaidAccess).toBe(false);
    expect(status.blocked).toBe(true);
    expect(status.blockedReason).toBe("trial_expired");
  });

  it("unblocks when a paid invoice exists", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-10T00:00:00.000Z");
    const status = computeBillingGateStatus({
      organizationCreatedAt: createdAt,
      now,
      paidInvoice: { id: "inv_1", status: "paid", amountCents: 19900, periodEnd: "2026-02-01T00:00:00.000Z" },
    });
    expect(status.hasPaidAccess).toBe(true);
    expect(status.blocked).toBe(false);
  });

  it("blocks when subscription is manually inactive even if invoice is paid", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-10T00:00:00.000Z");
    const status = computeBillingGateStatus({
      organizationCreatedAt: createdAt,
      now,
      paidInvoice: { id: "inv_paid", status: "paid", amountCents: 19900, periodEnd: "2026-02-01T00:00:00.000Z" },
      settings: { featureFlags: { billingSubscriptionActive: false } },
    });
    expect(status.hasPaidAccess).toBe(false);
    expect(status.blocked).toBe(true);
    expect(status.blockedReason).toBe("subscription_inactive");
  });

  it("allows manual activation without paid invoice", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-10T00:00:00.000Z");
    const status = computeBillingGateStatus({
      organizationCreatedAt: createdAt,
      now,
      settings: { featureFlags: { billingSubscriptionActive: true } },
    });
    expect(status.hasPaidAccess).toBe(true);
    expect(status.blocked).toBe(false);
  });

  it("unblocks with active stripe subscription", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-10T00:00:00.000Z");
    const status = computeBillingGateStatus({
      organizationCreatedAt: createdAt,
      now,
      subscription: { stripeSubscriptionId: "sub_1", status: "active" },
    });
    expect(status.hasPaidAccess).toBe(true);
    expect(status.blocked).toBe(false);
  });

  it("uses fallback invoices from feature flags", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-10T00:00:00.000Z");
    const status = computeBillingGateStatus({
      organizationCreatedAt: createdAt,
      now,
      settings: {
        featureFlags: { billingInvoices: [{ status: "paid", amountCents: 19900, paidAt: "2026-01-09T00:00:00.000Z" }] },
      },
    });
    expect(status.hasPaidAccess).toBe(true);
    expect(status.blocked).toBe(false);
  });

  it("does not treat zero-amount invoices as paid access", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-10T00:00:00.000Z");
    const status = computeBillingGateStatus({
      organizationCreatedAt: createdAt,
      now,
      paidInvoice: { id: "inv_0", status: "paid", amountCents: 0, periodEnd: "2026-02-01T00:00:00.000Z" },
    });
    expect(status.hasPaidAccess).toBe(false);
    expect(status.blocked).toBe(true);
  });

  it("keeps access while cancellation is scheduled", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-10T00:00:00.000Z");
    const status = computeBillingGateStatus({
      organizationCreatedAt: createdAt,
      now,
      paidInvoice: { id: "inv_paid", status: "paid", amountCents: 19900, periodEnd: "2026-02-01T00:00:00.000Z" },
      settings: { featureFlags: { billingSubscriptionCancelAt: "2026-02-01T00:00:00.000Z" } },
    });
    expect(status.hasPaidAccess).toBe(true);
    expect(status.blocked).toBe(false);
  });

  it("blocks after scheduled cancellation date", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-02-02T00:00:00.000Z");
    const status = computeBillingGateStatus({
      organizationCreatedAt: createdAt,
      now,
      paidInvoice: { id: "inv_paid", status: "paid", amountCents: 19900, periodEnd: "2026-02-01T00:00:00.000Z" },
      settings: { featureFlags: { billingSubscriptionCancelAt: "2026-02-01T00:00:00.000Z" } },
    });
    expect(status.hasPaidAccess).toBe(false);
    expect(status.blocked).toBe(true);
    expect(status.blockedReason).toBe("subscription_inactive");
  });
});
