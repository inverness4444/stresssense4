import { describe, it, expect } from "vitest";
import { computeSurveyStats, normalizeScale } from "@/lib/surveys";

describe("stress metrics", () => {
  it("normalizes average scale to 0-100", () => {
    expect(normalizeScale(3, 1, 5)).toBe(50);
    expect(normalizeScale(5, 1, 5)).toBe(100);
    expect(normalizeScale(1, 1, 5)).toBe(0);
  });

  it("computes participation and stress index", () => {
    const stats = computeSurveyStats(
      2,
      4,
      [
        { id: "q1", type: "SCALE", scaleMin: 1, scaleMax: 5 },
        { id: "q2", type: "SCALE", scaleMin: 1, scaleMax: 5 },
      ] as any,
      [
        { answers: [{ questionId: "q1", scaleValue: 5 }, { questionId: "q2", scaleValue: 3 }] },
        { answers: [{ questionId: "q1", scaleValue: 4 }, { questionId: "q2", scaleValue: 4 }] },
      ] as any,
      1,
      5
    );
    expect(stats.participation).toBe(50);
    expect(stats.averageStressIndex).toBeGreaterThan(60);
  });
});
