import { describe, expect, it } from "vitest";

import {
  generateCritiqueToken,
  hashCritiqueToken,
  isCritiqueToken,
  parseCritiqueScores,
  parseLegacyFilmScore,
  roomAverages,
  spectatorAverage,
} from "./critique-policy";

describe("critique tokens", () => {
  it("generates a compact url-safe token", () => {
    const token = generateCritiqueToken();
    expect(isCritiqueToken(token)).toBe(true);
    expect(hashCritiqueToken(token)).toHaveLength(64);
  });
});

describe("scores", () => {
  it("averages five categories to one decimal", () => {
    expect(
      spectatorAverage({
        fotografia: 8,
        sonido: 7,
        actuacion: 9,
        guion: 6,
        direccion: 8,
      }),
    ).toBe(7.6);
  });

  it("rejects scores outside 0-10", () => {
    expect(() => parseCritiqueScores({ fotografia: 11 })).toThrow(/0 a 10/);
  });

  it("computes the room average from spectators", () => {
    const first = { fotografia: 10, sonido: 10, actuacion: 10, guion: 10, direccion: 10 };
    const second = { fotografia: 6, sonido: 6, actuacion: 6, guion: 6, direccion: 6 };
    expect(roomAverages([10, 6], [first, second])).toEqual({
      room: 8,
      categories: { fotografia: 8, sonido: 8, actuacion: 8, guion: 8, direccion: 8 },
    });
  });

  it("accepts legacy one-decimal scores", () => {
    expect(parseLegacyFilmScore("7,5")).toBe(7.5);
  });
});
