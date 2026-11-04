import { describe, expect, it } from "vitest";

import { SALA_LIST_MARK_IDS } from "@/components/sala-list-marks";

import {
  createSalaListVoterId,
  nextSalaListCount,
  parseSalaListCounts,
  parseSalaListFilmId,
  parseSalaListVotedIds,
  parseSalaListVoterId,
  planSalaListToggle,
  SALA_LIST,
  salaListCopy,
} from "./sala-list-policy";

describe("sala list catalog", () => {
  it("holds fifty unique pending films", () => {
    expect(SALA_LIST).toHaveLength(50);
    expect(new Set(SALA_LIST.map((film) => film.id)).size).toBe(50);
    expect(new Set(SALA_LIST.map((film) => film.title)).size).toBe(50);
    expect(SALA_LIST_MARK_IDS.sort()).toEqual([...SALA_LIST.map((film) => film.id)].sort());
  });

  it("keeps bios short enough to say a lot", () => {
    for (const film of SALA_LIST) {
      expect(film.bio.length).toBeGreaterThan(24);
      expect(film.bio.length).toBeLessThanOrEqual(120);
      expect(film.title.length).toBeGreaterThan(2);
      expect(film.year).toBeGreaterThan(1950);
    }
  });
});

describe("sala list votes", () => {
  it("toggles one film on and off without going negative", () => {
    const added = planSalaListToggle("parasite", []);
    expect(added).toEqual({ filmId: "parasite", voted: true, nextIds: ["parasite"] });
    expect(nextSalaListCount(0, true)).toBe(1);

    const removed = planSalaListToggle("parasite", added.nextIds);
    expect(removed.voted).toBe(false);
    expect(removed.nextIds).toEqual([]);
    expect(nextSalaListCount(1, false)).toBe(0);
    expect(nextSalaListCount(0, false)).toBe(0);
  });

  it("lets the same browser mark many titles", () => {
    const first = planSalaListToggle("oldboy", []);
    const second = planSalaListToggle("whiplash", first.nextIds);
    expect(second.nextIds).toEqual(["oldboy", "whiplash"]);
    expect(() => planSalaListToggle("inception", [])).toThrow(/lista/);
    expect(() => parseSalaListFilmId("past-lives")).toThrow();
  });

  it("keeps only catalog counts and voted ids", () => {
    expect(parseSalaListCounts({ parasite: 4.8, inception: 9, oldboy: -2 })).toEqual({ parasite: 4 });
    expect(parseSalaListVotedIds(["parasite", "parasite", "inception", 3])).toEqual(["parasite"]);
  });

  it("stores a uuid in the anonymous cookie", () => {
    const id = createSalaListVoterId();
    expect(parseSalaListVoterId(id)).toBe(id);
    expect(parseSalaListVoterId("nope")).toBe(null);
    expect(parseSalaListVoterId("")).toBe(null);
  });

  it("invites the tap in a short line", () => {
    expect(salaListCopy(0)).toMatch(/Tocá las que querés/);
    expect(salaListCopy(1)).toBe("Marcaste 1. La sala anota.");
    expect(salaListCopy(7)).toBe("Marcaste 7. La sala anota.");
  });
});
