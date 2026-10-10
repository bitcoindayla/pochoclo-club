import { describe, expect, it } from "vitest";
import { calculateLandingStats, qualifiesForLandingStats } from "./landing-stats-policy";

const baseline = { screenings: 46, peoplePerScreening: 10, reservationsFrom: 100 };

describe("landing attendance totals", () => {
  it("starts from the historical estimate without recounting old reservations", () => {
    expect(calculateLandingStats(baseline, [
      { id: "old", startsAt: 99, status: "closed", reservations: 14 },
    ], 200)).toEqual({ functionsCount: 46, people: 460 });
  });
  it("adds real reservations per completed night, including repeat visitors and guests", () => {
    expect(calculateLandingStats(baseline, [
      { id: "first", startsAt: 100, status: "closed", reservations: 12 },
      { id: "second", startsAt: 150, status: "closed", reservations: 7 },
      { id: "first", startsAt: 100, status: "closed", reservations: 12 },
    ], 200)).toEqual({ functionsCount: 48, people: 479 });
  });
  it("does not count future dates, drafts or open reservations", () => {
    expect(calculateLandingStats(baseline, [
      { id: "future", startsAt: 201, status: "closed", reservations: 14 },
      { id: "draft", startsAt: 100, status: "draft", reservations: 0 },
      { id: "open", startsAt: 150, status: "open", reservations: 8 },
    ], 200)).toEqual({ functionsCount: 46, people: 460 });
    expect(qualifiesForLandingStats({ startsAt: 200, status: "closed" }, 100, 200)).toBe(true);
  });
});
