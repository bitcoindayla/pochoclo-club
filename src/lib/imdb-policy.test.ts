import { describe, expect, it } from "vitest";

import { formatImdbRating, imdbTitleUrl, parseImdbId, parseImdbRating } from "./imdb-policy";

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
