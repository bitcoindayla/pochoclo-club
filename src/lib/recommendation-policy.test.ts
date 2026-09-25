import { describe, expect, it } from "vitest";

import {
  assertRecommendationReveal,
  parseRecommendationMovie,
  parseRecommendationSelection,
  RECOMMENDATION_IDS,
  type RecommendationMovie,
} from "./recommendation-policy";

const movies: RecommendationMovie[] = RECOMMENDATION_IDS.map((id, index) => ({
  id, title: `Película ${index + 1}`, director: "Directora", year: 2000,
  reason: "Una película para descubrir juntos.",
  image: { landscapePath: "landscape.webp", portraitPath: "portrait.webp", sourceWidth: 1920, sourceHeight: 1080, accent: "#fff" },
}));

describe("Pochoclo Recomienda", () => {
  it("accepts one, two or all three films and normalizes their order", () => {
    expect(parseRecommendationSelection(["pick-2"], movies)).toEqual(["pick-2"]);
    expect(parseRecommendationSelection(["pick-3", "pick-1"], movies)).toEqual(["pick-1", "pick-3"]);
    expect(parseRecommendationSelection(["pick-3", "pick-1", "pick-2"], movies)).toEqual(RECOMMENDATION_IDS);
  });

  it.each([[], ["pick-1", "pick-1"], ["pick-4"], ["pick-1", "pick-2", "pick-3", "pick-4"], [null]])(
    "rejects empty, duplicate and unknown selections: %j", (...ids) => {
      expect(() => parseRecommendationSelection(ids, movies)).toThrow();
    },
  );

  it("requires the critique to be closed and all three films to have artwork", () => {
    expect(() => assertRecommendationReveal(movies, "scoring")).toThrow(/puntajes/);
    expect(() => assertRecommendationReveal(movies.slice(0, 2), "closed")).toThrow(/tres/);
    expect(() => assertRecommendationReveal([movies[0], movies[1], movies[1]], "closed")).toThrow(/tres/);
    expect(() => assertRecommendationReveal(movies.map((movie) => ({ ...movie, image: null })), "closed")).toThrow(/arte/);
    expect(() => assertRecommendationReveal(movies, "closed")).not.toThrow();
  });

  it("validates editorial copy, supports an optional year, and rejects extra slots", () => {
    const form = new FormData();
    form.set("movieId", "pick-1");
    form.set("title", "  Una película  ");
    form.set("director", "Una directora");
    form.set("reason", "Nos invita a mirar de otra manera.");
    expect(parseRecommendationMovie(form)).toMatchObject({ title: "Una película", year: null });
    form.set("year", "2020");
    expect(parseRecommendationMovie(form).year).toBe(2020);
    form.set("reason", "x".repeat(361));
    expect(() => parseRecommendationMovie(form)).toThrow(/360/);
    form.set("reason", "Una razón.");
    form.set("movieId", "pick-4");
    expect(() => parseRecommendationMovie(form)).toThrow(/tres/);
  });
});
