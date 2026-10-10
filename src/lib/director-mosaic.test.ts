import { describe, expect, it } from "vitest";
import { groupDirectors, isLandingBallotLive, layoutDirectors } from "./director-mosaic";

const films = [
  { id: "1", director: "Ruben Ostlund", title: "The Square", year: 2017, score: 8 },
  { id: "2", director: " Ruben Östlund ", title: "Force Majeure", year: 2014, score: 6 },
  { id: "3", director: "Jane Schoenbrun", title: "Camp Miasma", year: 2026, score: 7 },
];

describe("director archive", () => {
  it("groups spelling variants and weights by film count times average without leaking other data", () => {
    const groups = groupDirectors(films.map(film => ({ ...film, attendees: [{ name: "Private member" }] })));
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ name: "Ruben Östlund", weight: 14, average: 7 });
    expect(groups[0].films).toHaveLength(2);
    expect(groups[0].films.every((film) => film.hasEssay === false)).toBe(true);
    expect(JSON.stringify(groups)).not.toContain("Private member");
  });
  it.each([[1440, 812], [390, 2240], [800, 580]])("fills %s×%s without overlaps and preserves proportional area", (width, height) => {
    const groups = groupDirectors(films);
    const rects = layoutDirectors(groups, width, height);
    const total = groups.reduce((sum, group) => sum + group.weight, 0);
    expect(rects.reduce((sum, rect) => sum + rect.width * rect.height, 0)).toBeCloseTo(width * height);
    rects.forEach((rect, i) => {
      expect(rect.width * rect.height / (width * height)).toBeCloseTo(groups[i].weight / total);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1e-8);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height + 1e-8);
      rects.slice(i + 1).forEach(other => {
        const overlapX = Math.min(rect.x + rect.width, other.x + other.width) - Math.max(rect.x, other.x);
        const overlapY = Math.min(rect.y + rect.height, other.y + other.height) - Math.max(rect.y, other.y);
        expect(overlapX <= 1e-8 || overlapY <= 1e-8).toBe(true);
      });
    });
  });
  it("handles empty archives and keeps zero-score directors reachable", () => {
    expect(layoutDirectors([], 100, 100)).toEqual([]);
    const groups = groupDirectors([{ ...films[0], score: 0 }]);
    expect(layoutDirectors(groups, 100, 100)).toEqual([{ x: 0, y: 0, width: 100, height: 100 }]);
  });
  it("marks archive films that already have a public note", () => {
    const groups = groupDirectors([
      { ...films[0], hasEssay: true },
      { ...films[2], hasEssay: false },
    ]);
    expect(groups.find((group) => group.name === "Ruben Ostlund")?.films[0].hasEssay).toBe(true);
    expect(groups.find((group) => group.name === "Jane Schoenbrun")?.films[0].hasEssay).toBe(false);
  });

  it("uses the original home only for an open, unexpired ballot", () => {
    expect(isLandingBallotLive(null, 100)).toBe(false);
    expect(isLandingBallotLive({ status: "open", closesAt: 101 }, 100)).toBe(true);
    expect(isLandingBallotLive({ status: "open", closesAt: 100 }, 100)).toBe(false);
    for (const status of ["draft", "closed", "canceled", "tie"]) {
      expect(isLandingBallotLive({ status, closesAt: 101 }, 100)).toBe(false);
    }
  });
});
