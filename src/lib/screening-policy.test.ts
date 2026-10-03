import { describe, expect, it } from "vitest";

import {
  localScreeningDate,
  parseScreeningInput,
  suggestBallotClose,
  suggestNextScreening,
} from "./screening-policy";

describe("screening input", () => {
  it("converts Mendoza local time to the correct instant", () => {
    expect(localScreeningDate("2026-08-09", "20:30").toISOString()).toBe(
      "2026-08-09T23:30:00.000Z",
    );
  });

  it("rejects impossible dates", () => {
    expect(() => localScreeningDate("2026-02-30", "20:30")).toThrow();
  });

  it("normalizes optional copy and rejects past functions", () => {
    const formData = new FormData();
    formData.set("date", "2026-08-09");
    formData.set("time", "20:30");
    formData.set("title", "  Una película  ");
    formData.set("message", "   ");

    expect(parseScreeningInput(formData, new Date("2026-08-04T12:00:00Z"))).toMatchObject({
      localDate: "2026-08-09",
      localTime: "20:30",
      title: "Una película",
      message: null,
    });
    expect(() => parseScreeningInput(formData, new Date("2026-08-10T12:00:00Z"))).toThrow(
      "futuro",
    );
  });
});

describe("next club Sunday", () => {
  it("proposes the coming Sunday at 20:00 Mendoza", () => {
    expect(suggestNextScreening(new Date("2026-10-03T15:00:00.000Z"))).toMatchObject({
      localDate: "2026-10-04",
      localTime: "20:00",
    });
  });

  it("skips a Sunday that already started", () => {
    expect(suggestNextScreening(new Date("2026-10-04T23:30:00.000Z")).localDate).toBe(
      "2026-10-11",
    );
  });

  it("closes the ballot the Saturday before", () => {
    expect(suggestBallotClose("2026-10-04", "20:00")).toEqual({
      localDate: "2026-10-03",
      localTime: "18:00",
    });
  });
});
