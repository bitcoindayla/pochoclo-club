import { describe, expect, it } from "vitest";

import { isLandingImagePath, landingImageUrls, parseLandingMovie } from "./landing-policy";

describe("landing image policy", () => {
  it("accepts only versioned landing webp paths", () => {
    expect(isLandingImagePath("landing/abc-1234-5678-landscape.webp")).toBe(true);
    expect(isLandingImagePath("landing/abc-1234-5678-portrait.webp")).toBe(true);
    expect(isLandingImagePath("movie-ballots/x/movie-1/v-landscape.webp")).toBe(false);
    expect(isLandingImagePath("landing/../secret-landscape.webp")).toBe(false);
  });

  it("builds cache-busted public urls", () => {
    expect(landingImageUrls("v1")).toEqual({
      landscape: "/api/landing-image/landscape?v=v1",
      portrait: "/api/landing-image/portrait?v=v1",
    });
  });

  it("normalizes film credits and rejects incomplete or invalid metadata", () => {
    const form = new FormData();
    form.set("title", "  La película  ");
    form.set("director", "  Su directora  ");
    form.set("year", " 2025 ");
    expect(parseLandingMovie(form)).toEqual({ title: "La película", director: "Su directora", year: 2025 });
    for (const value of ["", "1887", "2101", "2025.5", "2e3", "abcd"]) {
      form.set("year", value);
      expect(() => parseLandingMovie(form)).toThrow("año válido");
    }
    form.set("year", "2025");
    for (const field of ["title", "director"]) {
      const original = form.get(field) as string;
      for (const value of ["   ", "x".repeat(121)]) {
        form.set(field, value);
        expect(() => parseLandingMovie(form)).toThrow("120 caracteres");
      }
      form.set(field, original);
    }
  });
});
