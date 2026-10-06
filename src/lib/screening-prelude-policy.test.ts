import { describe, expect, it } from "vitest";

import {
  defaultFeaturedId,
  formatCountdown,
  preludeFilmsFrom,
  rankPreludeFilms,
  remainingToStart,
} from "./screening-prelude-policy";

const films = [
  {
    id: "movie-2",
    title: "The Handmaiden",
    year: 2016,
    director: "Park Chan-wook",
    bio: "Engaño.",
    votes: 4,
    stillUrl: "/api/movie-images/s1/movie-2/landscape",
    isWinner: false,
  },
  {
    id: "movie-1",
    title: "Past Lives",
    year: 2023,
    director: "Celine Song",
    bio: "Nora.",
    votes: 8,
    stillUrl: "/api/movie-images/s1/movie-1/landscape",
    isWinner: true,
  },
  {
    id: "movie-3",
    title: "Tár",
    year: 2022,
    director: "Todd Field",
    bio: "Poder.",
    votes: 8,
    stillUrl: null,
    isWinner: false,
  },
];

describe("screening prelude", () => {
  it("counts down to the start and freezes at zero once the function began", () => {
    const startsAt = new Date("2026-10-04T23:00:00.000Z");
    expect(formatCountdown(remainingToStart(startsAt, new Date("2026-10-04T22:01:05.000Z")))).toBe(
      "00:58:55",
    );
    expect(remainingToStart(startsAt, new Date("2026-10-04T23:00:00.000Z"))).toMatchObject({
      started: true,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("ranks by votes and uses the winner, or the screening title, as the featured film", () => {
    expect(rankPreludeFilms(films).map((film) => film.id)).toEqual(["movie-1", "movie-3", "movie-2"]);
    expect(defaultFeaturedId(films)).toBe("movie-1");
    expect(defaultFeaturedId(films.map((film) => ({ ...film, isWinner: false })), "Tár")).toBe(
      "movie-3",
    );
  });

  it("builds the TV list from the ballot stills and falls back to the screening movie", () => {
    expect(
      preludeFilmsFrom({
        screeningId: "s1",
        movie: null,
        ballot: {
          winnerOptionId: "movie-1",
          counts: { "movie-1": 8, "movie-2": 4 },
          options: [
            {
              id: "movie-1",
              title: "Past Lives",
              year: 2023,
              director: "Celine Song",
              bio: "Nora.",
              image: { landscapePath: "movie-ballots/s1/movie-1/v-landscape.webp" },
            },
            {
              id: "movie-2",
              title: "The Handmaiden",
              year: 2016,
              director: "Park Chan-wook",
              bio: "Engaño.",
            },
          ],
        },
      }),
    ).toEqual([
      {
        id: "movie-1",
        title: "Past Lives",
        year: 2023,
        director: "Celine Song",
        bio: "Nora.",
        votes: 8,
        stillUrl: "/api/movie-images/s1/movie-1/landscape",
        isWinner: true,
      },
      {
        id: "movie-2",
        title: "The Handmaiden",
        year: 2016,
        director: "Park Chan-wook",
        bio: "Engaño.",
        votes: 4,
        stillUrl: null,
        isWinner: false,
      },
    ]);
    expect(
      preludeFilmsFrom({
        screeningId: "s1",
        movie: { title: "Past Lives", year: 2023, director: "Celine Song", bio: "Nora." },
        ballot: null,
      }),
    ).toMatchObject([{ id: "tonight", title: "Past Lives", isWinner: true, stillUrl: null }]);
  });
});
