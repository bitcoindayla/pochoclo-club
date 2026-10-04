import { describe, expect, it } from "vitest";

import {
  catalogFestivalMarks,
  festivalFromAwardHint,
  festivalMarkLabel,
  festivalMarksKey,
  marksFromAwardHints,
  mergeFestivalMarks,
  parseFestivalMarks,
} from "./festival-policy";

describe("festival marks", () => {
  it("keeps one mark per festival and prefers a win over a nomination", () => {
    expect(
      mergeFestivalMarks([
        { id: "oscar", result: "nominated" },
        { id: "cannes", result: "won" },
        { id: "oscar", result: "won" },
        { id: "cannes", result: "nominated" },
      ]),
    ).toEqual([
      { id: "cannes", result: "won" },
      { id: "oscar", result: "won" },
    ]);
  });

  it("orders the four majors and labels them in Spanish", () => {
    expect(
      mergeFestivalMarks([
        { id: "sansebastian", result: "nominated" },
        { id: "oscar", result: "nominated" },
        { id: "venice", result: "won" },
        { id: "cannes", result: "nominated" },
      ]).map((mark) => festivalMarkLabel(mark)),
    ).toEqual([
      "Nominada en Cannes",
      "Ganó en Venecia",
      "Nominada en los Oscars",
      "Nominada en San Sebastián",
    ]);
  });

  it("seeds the live Deseo y poder slate", () => {
    expect(catalogFestivalMarks("tt13238346")).toEqual([
      { id: "oscar", result: "nominated" },
    ]);
    expect(catalogFestivalMarks("tt4016934")).toEqual([{ id: "cannes", result: "won" }]);
    expect(catalogFestivalMarks("tt5083738")).toEqual([
      { id: "venice", result: "won" },
      { id: "oscar", result: "won" },
    ]);
    expect(catalogFestivalMarks("tt8613070")).toEqual([
      { id: "cannes", result: "won" },
      { id: "sansebastian", result: "nominated" },
    ]);
    expect(catalogFestivalMarks("tt14444726")).toEqual([
      { id: "venice", result: "won" },
      { id: "oscar", result: "nominated" },
    ]);
  });

  it("maps Wikidata awards to the four festivals and ignores the rest", () => {
    expect(
      marksFromAwardHints([
        {
          qid: "Q103618",
          result: "won",
          labels: ["Academy Award for Best Actress"],
        },
        {
          qid: "Q725932",
          result: "won",
          labels: ["CST Award of the Technical Artist"],
          orgQids: ["Q163536"],
        },
        {
          qid: "Q209459",
          result: "nominated",
          labels: ["Golden Lion"],
        },
        {
          result: "nominated",
          labels: ["Sebastiane Award", "San Sebastián International Film Festival"],
        },
        {
          qid: "Q777921",
          result: "won",
          labels: ["European Film Award for Best Film"],
          orgQids: ["Q1377733"],
        },
      ]),
    ).toEqual([
      { id: "cannes", result: "won" },
      { id: "venice", result: "nominated" },
      { id: "oscar", result: "won" },
      { id: "sansebastian", result: "nominated" },
    ]);
    expect(
      festivalFromAwardHint({
        result: "won",
        labels: ["European Film Award for Best Film"],
      }),
    ).toBeNull();
    expect(
      festivalFromAwardHint({
        result: "won",
        labels: ["Golden Bear", "Berlin International Film Festival"],
      }),
    ).toBeNull();
  });

  it("drops invalid stored marks", () => {
    expect(
      parseFestivalMarks([
        { id: "oscar", result: "won" },
        { id: "berlin", result: "nominated" },
        { id: "sundance", result: "won" },
        { id: "cannes", result: "maybe" },
        null,
      ]),
    ).toEqual([{ id: "oscar", result: "won" }]);
    expect(festivalMarksKey([{ id: "oscar", result: "nominated" }])).toBe("oscar:nominated");
  });
});
