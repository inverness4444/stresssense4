import { describe, it, expect } from "vitest";
import { computeOverallStressFromDrivers, scoreAnswer, type DriverKey } from "@/lib/stressScoring";

describe("stress scoring with polarity", () => {
  it("POSITIVE 10/10 does not increase stress", () => {
    const scored = scoreAnswer(
      { scaleValue: 10 },
      { type: "SCALE", scaleMin: 0, scaleMax: 10, polarity: "POSITIVE", driverKey: "workload_deadlines" }
    );
    expect(scored?.stressScore).toBe(0);
  });

  it("NEGATIVE 10/10 increases stress", () => {
    const scored = scoreAnswer(
      { scaleValue: 10 },
      { type: "SCALE", scaleMin: 0, scaleMax: 10, polarity: "NEGATIVE", driverKey: "workload_deadlines" }
    );
    expect(scored?.stressScore).toBe(10);
  });

  it("aggregates driver scores as average of driver averages", () => {
    const totals = new Map<DriverKey, { sum: number; count: number }>([
      ["workload_deadlines", { sum: 16, count: 2 }],
      ["clarity_priorities", { sum: 4, count: 1 }],
    ]);
    const result = computeOverallStressFromDrivers(totals);
    expect(result.avg).toBeCloseTo(6, 1);
    expect(result.driverCount).toBe(2);
  });
});
