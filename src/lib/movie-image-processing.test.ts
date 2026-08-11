import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  MovieImageProcessingError,
  processMovieImageSource,
} from "./movie-image-processing";

describe("movie image processing", () => {
  it("creates exact landscape and portrait crops without stretching", async () => {
    const source = await sharp({
      create: {
        width: 2_000,
        height: 1_200,
        channels: 3,
        background: { r: 30, g: 70, b: 110 },
      },
    }).jpeg().toBuffer();

    const result = await processMovieImageSource({ source, mimeType: "image/jpeg" });
    const [landscape, portrait] = await Promise.all([
      sharp(result.landscape).metadata(),
      sharp(result.portrait).metadata(),
    ]);

    expect(landscape).toMatchObject({ width: 1920, height: 1080, format: "webp" });
    expect(portrait).toMatchObject({ width: 864, height: 1080, format: "webp" });
    expect(result).toMatchObject({ sourceWidth: 2000, sourceHeight: 1200 });
    expect(result.accent).toMatch(/^rgb\(\d+ \d+ \d+\)$/);
  });

  it("rejects tiny, mislabeled and malformed files", async () => {
    const tiny = await sharp({
      create: {
        width: 800,
        height: 450,
        channels: 3,
        background: "black",
      },
    }).png().toBuffer();

    await expect(
      processMovieImageSource({ source: tiny, mimeType: "image/png" }),
    ).rejects.toThrow("muy chica");
    await expect(
      processMovieImageSource({ source: tiny, mimeType: "image/gif" }),
    ).rejects.toBeInstanceOf(MovieImageProcessingError);
    await expect(
      processMovieImageSource({ source: Buffer.from("no es una imagen"), mimeType: "image/jpeg" }),
    ).rejects.toThrow("leer");
    await expect(
      processMovieImageSource({
        source: Buffer.alloc(3 * 1024 * 1024 + 1),
        mimeType: "image/jpeg",
      }),
    ).rejects.toThrow("3 MB");
  });
});
