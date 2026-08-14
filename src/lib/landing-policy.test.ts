import { describe, expect, it } from "vitest";

import { isLandingImagePath, landingImageUrls } from "./landing-policy";

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
});
