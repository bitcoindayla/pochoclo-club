import { describe, expect, it } from "vitest";

import { contrastRatio, landingLogoColors, landingPhotoAccent } from "./landing-logo";

const rgb = (css: string) => css.match(/\d+/g)!.map(Number) as [number, number, number];

describe("landing logo contrast", () => {
  it.each<[number, number, number]>([
    [255, 255, 255], [5, 5, 5], [128, 128, 128], [190, 155, 60], [30, 75, 42],
  ])("keeps readable photo-derived shades on rgb(%i %i %i)", (r, g, b) => {
    const background: [number, number, number] = [r, g, b];
    const palette = landingLogoColors("rgb(190 155 60)", [background]);
    const color = rgb(palette.color);
    expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(contrastRatio([190, 155, 60], background));
    expect(color[0]).toBeGreaterThan(color[2]);
    expect(color[0] - color[2]).toBeGreaterThan(90);
  });

  it("preserves the photo's blue on mixed backgrounds without adding an outline", () => {
    const palette = landingLogoColors("rgb(90 160 180)", [[255, 255, 255], [0, 0, 0]]);
    const color = rgb(palette.color);
    expect(color[2] - color[0]).toBeGreaterThan(65);
    expect(Math.min(...color)).toBeGreaterThan(60);
    expect(Math.max(...color)).toBeLessThan(210);
    expect(palette).not.toHaveProperty("outline");
  });

  it("prefers a blue subject to the brown surroundings", () => {
    const pixels = new Uint8ClampedArray(20 * 20 * 4);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const subject = x >= 5 && x <= 14 && y >= 5 && y <= 14;
        pixels.set(subject ? [90, 160, 180, 255] : [140, 90, 45, 255], (y * 20 + x) * 4);
      }
    }
    expect(landingPhotoAccent(pixels, 20)).toBe("rgb(90 160 180)");
  });

  it("extracts a photo color even when neutral sky or shadows are more common", () => {
    const pixels = new Uint8ClampedArray([
      ...Array(20).fill([190, 190, 190, 255]).flat(),
      190, 155, 60, 255, 190, 155, 60, 255,
      0, 0, 0, 255, 255, 0, 0, 0,
    ]);
    expect(landingPhotoAccent(pixels)).toBe("rgb(190 155 60)");
    expect(landingPhotoAccent(new Uint8ClampedArray([128, 128, 128, 255]))).toBeNull();
  });

  it("handles old photos without an accent and unavailable samples", () => {
    for (const accent of [null, "", "invalid"]) {
      const palette = landingLogoColors(accent, []);
      expect(contrastRatio(rgb(palette.color), [5, 5, 5])).toBeGreaterThanOrEqual(4.5);
    }
  });
});
