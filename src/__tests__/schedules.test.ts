import { describe, it, expect } from "vitest";
import { shouldRunSchedule } from "@/lib/surveySchedules";

describe("survey schedules", () => {
  it("runs weekly when enough time passed", () => {
    const now = new Date("2024-01-15T09:00:00Z"); // Monday
    const last = new Date("2024-01-08T09:00:00Z");
    const run = shouldRunSchedule({
      schedule: { frequency: "WEEKLY", dayOfWeek: 1, dayOfMonth: null, startsOn: null },
      lastSurveyDate: last,
      now,
    });
    expect(run).toBe(true);
  });

  it("skips before start date", () => {
    const now = new Date("2024-01-01T09:00:00Z");
    const run = shouldRunSchedule({
      schedule: { frequency: "WEEKLY", dayOfWeek: 1, dayOfMonth: null, startsOn: new Date("2024-02-01T00:00:00Z") },
      lastSurveyDate: null,
      now,
    });
    expect(run).toBe(false);
  });
});
