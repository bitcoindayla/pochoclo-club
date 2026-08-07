import { describe, expect, it } from "vitest";

import { localScreeningDate, parseScreeningInput } from "./screening-policy";

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
