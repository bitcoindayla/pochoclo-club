import { describe, expect, it } from "vitest";

import {
  filmsWatchedOnOwn,
  parseTasteFilmIds,
  readOutsideFilmIds,
  tasteGateDay,
  tasteProgressCopy,
  TASTE_GATE_MIN_FILMS,
} from "./taste-gate-policy";

const ten = Array.from({ length: 10 }, (_, index) => `film${String(index).padStart(4, "0")}xxxx`);

describe("taste gate", () => {
  it("asks for at least ten unique archive ids", () => {
    expect(parseTasteFilmIds(ten)).toEqual(ten);
    expect(() => parseTasteFilmIds(ten.slice(0, 9))).toThrow(/diez/);
    expect(parseTasteFilmIds([...ten, ten[0]])).toEqual(ten);
    expect(() => parseTasteFilmIds(["bad", "also"])).toThrow();
    expect(() => parseTasteFilmIds("nope")).toThrow();
  });

  it("uses the Mendoza calendar day for the daily cap", () => {
    expect(tasteGateDay(new Date("2026-10-11T02:30:00Z"))).toBe("2026-10-10");
    expect(tasteGateDay(new Date("2026-10-11T03:00:00Z"))).toBe("2026-10-11");
  });

  it("keeps personal watches out of the club night list", () => {
    expect(readOutsideFilmIds(["film0001xxxx", "bad", "film0001xxxx"])).toEqual(["film0001xxxx"]);
    expect(
      filmsWatchedOnOwn(
        [
          { id: "film0001xxxx", title: "Force majeure" },
          { id: "club-only", title: "Past Lives" },
        ],
        ["film0001xxxx"],
      ).map((film) => film.title),
    ).toEqual(["Force majeure"]);
  });

  it("keeps the progress line short", () => {
    expect(tasteProgressCopy(0)).toMatch(/Diez coincidencias/);
    expect(tasteProgressCopy(2)).toBe(`2 de ${TASTE_GATE_MIN_FILMS}. Seguí, sin vueltas.`);
    expect(tasteProgressCopy(9)).toBe("Una más y te abrimos la puerta.");
    expect(tasteProgressCopy(10)).toMatch(/Hay un lugar/);
  });
});
