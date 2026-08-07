import { describe, expect, it } from "vitest";

import { parseGuestName } from "./guest-policy";

describe("guest name", () => {
  it("is required and trims surrounding spaces", () => {
    expect(parseGuestName("  Mauro Pérez  ")).toBe("Mauro Pérez");
    expect(() => parseGuestName("   ")).toThrow("Escribí el nombre");
    expect(() => parseGuestName(null)).toThrow("Escribí el nombre");
  });

  it("accepts up to one hundred characters", () => {
    expect(parseGuestName("a".repeat(100))).toHaveLength(100);
    expect(() => parseGuestName("a".repeat(101))).toThrow("100 caracteres");
  });
});
