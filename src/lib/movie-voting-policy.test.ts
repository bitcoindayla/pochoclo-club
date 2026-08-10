import { describe, expect, it } from "vitest";

import {
  memberCanAccessSeats,
  parseMovieBallotInput,
  planMovieVote,
  resolveMovieBallot,
} from "./movie-voting-policy";

function ballotForm(movieCount = 3) {
  const formData = new FormData();
  formData.set("closeDate", "2026-08-15");
  formData.set("closeTime", "23:59");
  for (let index = 1; index <= movieCount; index += 1) {
    formData.set(`movieTitle${index}`, `Película ${index}`);
    formData.set(`movieYear${index}`, String(2000 + index));
    formData.set(`movieDirector${index}`, `Dirección ${index}`);
    formData.set(`movieBio${index}`, `Una sinopsis breve para la película ${index}.`);
  }
  return formData;
}

describe("movie ballot input", () => {
  it("accepts between three and five complete manual options", () => {
    expect(
      parseMovieBallotInput(ballotForm(5), new Date("2026-08-10T12:00:00Z")),
    ).toMatchObject({
      localCloseDate: "2026-08-15",
      localCloseTime: "23:59",
      options: [
        { id: "movie-1", title: "Película 1", year: 2001 },
        { id: "movie-2", title: "Película 2", year: 2002 },
        { id: "movie-3", title: "Película 3", year: 2003 },
        { id: "movie-4", title: "Película 4", year: 2004 },
        { id: "movie-5", title: "Película 5", year: 2005 },
      ],
    });
  });

  it("rejects repeated or incomplete movies", () => {
    const repeated = ballotForm();
    repeated.set("movieTitle3", "  pelicula 1 ");
    expect(() =>
      parseMovieBallotInput(repeated, new Date("2026-08-10T12:00:00Z")),
    ).toThrow("repetir");

    const incomplete = ballotForm();
    incomplete.delete("movieDirector2");
    expect(() =>
      parseMovieBallotInput(incomplete, new Date("2026-08-10T12:00:00Z")),
    ).toThrow("director");
  });
});

describe("approval voting", () => {
  it("lets a member approve several movies and later change them", () => {
    const first = planMovieVote({
      optionIds: ["a", "b", "c"],
      previousSelection: [],
      nextSelection: ["a", "c"],
      counts: { a: 0, b: 0, c: 0 },
    });
    expect(first).toEqual({
      selection: ["a", "c"],
      counts: { a: 1, b: 0, c: 1 },
      isFirstVote: true,
    });

    expect(
      planMovieVote({
        optionIds: ["a", "b", "c"],
        previousSelection: first.selection,
        nextSelection: ["b", "c"],
        counts: first.counts,
      }),
    ).toEqual({
      selection: ["b", "c"],
      counts: { a: 0, b: 1, c: 1 },
      isFirstVote: false,
    });
  });

  it("never permits an empty or unknown selection", () => {
    expect(() =>
      planMovieVote({
        optionIds: ["a", "b", "c"],
        previousSelection: ["a"],
        nextSelection: [],
        counts: { a: 1, b: 0, c: 0 },
      }),
    ).toThrow("por lo menos");
    expect(() =>
      planMovieVote({
        optionIds: ["a", "b", "c"],
        previousSelection: [],
        nextSelection: ["z"],
        counts: { a: 0, b: 0, c: 0 },
      }),
    ).toThrow("por lo menos");
  });
});

describe("movie ballot resolution", () => {
  it("selects a unique winner and sends ties to the administrator", () => {
    expect(resolveMovieBallot(["a", "b", "c"], { a: 4, b: 2, c: 1 })).toEqual({
      kind: "winner",
      winnerOptionId: "a",
      decisionOptionIds: [],
    });
    expect(resolveMovieBallot(["a", "b", "c"], { a: 4, b: 4, c: 1 })).toEqual({
      kind: "decision",
      winnerOptionId: null,
      decisionOptionIds: ["a", "b"],
    });
    expect(resolveMovieBallot(["a", "b", "c"], { a: 0, b: 0, c: 0 })).toEqual({
      kind: "decision",
      winnerOptionId: null,
      decisionOptionIds: ["a", "b", "c"],
    });
  });
});

describe("seat eligibility", () => {
  it("keeps legacy and canceled ballots open while gating active ballots", () => {
    expect(memberCanAccessSeats({ ballotStatus: null, hasVote: false, hasExemption: false })).toBe(true);
    expect(memberCanAccessSeats({ ballotStatus: "canceled", hasVote: false, hasExemption: false })).toBe(true);
    expect(memberCanAccessSeats({ ballotStatus: "open", hasVote: false, hasExemption: false })).toBe(false);
    expect(memberCanAccessSeats({ ballotStatus: "closed", hasVote: true, hasExemption: false })).toBe(true);
    expect(memberCanAccessSeats({ ballotStatus: "decision", hasVote: false, hasExemption: true })).toBe(true);
  });
});
