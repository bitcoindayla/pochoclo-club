import { describe, expect, it } from "vitest";

import {
  essayExcerpt,
  essayImageUrl,
  essayShareText,
  formatClubScore,
  isEssayImagePath,
  isFilmHistoryId,
  parseEssay,
  parseEssayImage,
  whatsappShareUrl,
} from "./essay-policy";

describe("essay policy", () => {
  it("accepts a club analysis and rejects a note that is too short or too long", () => {
    const essay = "Past Lives opera como una disección clínica y conmovedora sobre el duelo de las identidades. ".repeat(2);
    expect(parseEssay(`  ${essay}  `).startsWith("Past Lives")).toBe(true);
    expect(() => parseEssay("muy corta")).toThrow(/al menos 40/);
    expect(() => parseEssay("x".repeat(8001))).toThrow(/hasta 8000/);
  });

  it("accepts only versioned essay stills for a film id", () => {
    expect(isEssayImagePath("essays/GNZXnAswzdwG7dUQhbqY/abc-1234-landscape.webp")).toBe(true);
    expect(isEssayImagePath("essays/GNZXnAswzdwG7dUQhbqY/abc-1234-portrait.webp")).toBe(true);
    expect(isEssayImagePath("landing/abc-1234-landscape.webp")).toBe(false);
    expect(isEssayImagePath("essays/../secret-landscape.webp")).toBe(false);
    expect(isFilmHistoryId("GNZXnAswzdwG7dUQhbqY")).toBe(true);
    expect(isFilmHistoryId("essays/nope")).toBe(false);
  });

  it("keeps a stored still only when both crops are valid", () => {
    expect(
      parseEssayImage({
        landscapePath: "essays/film1/abc-1234-5678-landscape.webp",
        portraitPath: "essays/film1/abc-1234-5678-portrait.webp",
        version: "abc-1234-5678",
        accent: "rgb(10 10 10)",
        sourceWidth: 1920,
        sourceHeight: 1080,
      }),
    ).toMatchObject({ version: "abc-1234-5678" });
    expect(parseEssayImage({ landscapePath: "landing/v1-landscape.webp" })).toBeNull();
  });

  it("builds a WhatsApp text with comma score and a permalink, not the full essay", () => {
    const text = essayShareText({
      title: "Past Lives",
      year: 2023,
      director: "Celine Song",
      score: 8.6,
      url: "https://pochoclo.club/visto/GNZXnAswzdwG7dUQhbqY",
    });
    expect(text).toBe(
      "Te comparto la reseña de la peli que vimos el Domingo en el ciclo de Pochoclo.club\n\nPast Lives (2023)\nCeline Song\nPuntaje de la sala: 8,6\nhttps://pochoclo.club/visto/GNZXnAswzdwG7dUQhbqY",
    );
    expect(text.match(/https:\/\/pochoclo\.club\/visto\//g)).toHaveLength(1);
    expect(formatClubScore(8)).toBe("8,0");
    expect(whatsappShareUrl(text)).toContain("wa.me/?text=");
    expect(essayImageUrl("film1", "v2")).toBe("/api/essay-image/film1?variant=landscape&v=v2");
    expect(essayExcerpt("Uno.  Dos.", 8)).toBe("Uno. Do…");
  });
});
