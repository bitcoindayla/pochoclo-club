import { describe, expect, it } from "vitest";

import {
  clipMovieBio,
  formatImdbRating,
  imdbTitleUrl,
  parseCinemetaMovie,
  parseImdbId,
  parseImdbRating,
  pickImdbSuggestion,
} from "./imdb-policy";

describe("imdb ids", () => {
  it("reads the title id from a localized IMDb url", () => {
    expect(
      parseImdbId(
        "https://www.imdb.com/es-es/title/tt1798709/?ref_=nv_sr_srsg_1_tt_6_nm_1_in_0_q_her",
      ),
    ).toBe("tt1798709");
    expect(parseImdbId("tt2209764")).toBe("tt2209764");
    expect(parseImdbId("https://pochoclo.club")).toBeNull();
  });

  it("formats the club rating like IMDb", () => {
    expect(formatImdbRating(8)).toBe("8,0");
    expect(parseImdbRating("6.2")).toBe(6.2);
    expect(imdbTitleUrl("tt1798709")).toBe("https://www.imdb.com/title/tt1798709/");
  });
});

describe("movie catalog", () => {
  it("picks the IMDb title without a year when the name matches", () => {
    expect(
      pickImdbSuggestion(
        [
          { id: "tt5083738", l: "The Favourite", y: 2018, qid: "movie" },
          { id: "nm0000164", l: "The Favourite Fan" },
        ],
        "The Favourite",
      ),
    ).toBe("tt5083738");
  });

  it("reads year, director, rating and plot from Cinemeta", () => {
    expect(
      parseCinemetaMovie({
        meta: {
          id: "tt5083738",
          name: "The Favourite",
          year: "2018",
          imdbRating: "7.5",
          director: ["Yorgos Lanthimos"],
          description: "In early 18th-century England, a new servant endears herself to Queen Anne.",
        },
      }),
    ).toEqual({
      imdbId: "tt5083738",
      title: "The Favourite",
      year: 2018,
      director: "Yorgos Lanthimos",
      bio: "In early 18th-century England, a new servant endears herself to Queen Anne.",
      imdbRating: 7.5,
      imdbUrl: "https://www.imdb.com/title/tt5083738/",
    });
  });

  it("clips a long plot on a word", () => {
    const bio = clipMovieBio("alpha beta gamma delta", 14);
    expect(bio.endsWith("…")).toBe(true);
    expect(bio.length).toBeLessThanOrEqual(14);
  });
});
