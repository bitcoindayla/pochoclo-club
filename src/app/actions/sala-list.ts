"use server";

import { cookies } from "next/headers";

import { toggleSalaListVote } from "@/lib/sala-list";
import {
  createSalaListVoterId,
  parseSalaListVoterId,
  SalaListError,
} from "@/lib/sala-list-policy";
import { SALA_LIST_COOKIE } from "@/lib/session";

export type SalaListVoteResult = {
  error: string | null;
  filmId: string | null;
  voted: boolean | null;
  count: number | null;
};

export async function toggleSalaListVoteAction(filmId: string): Promise<SalaListVoteResult> {
  try {
    const store = await cookies();
    let voterId = parseSalaListVoterId(store.get(SALA_LIST_COOKIE)?.value);
    if (!voterId) {
      voterId = createSalaListVoterId();
      store.set(SALA_LIST_COOKIE, voterId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 400,
      });
    }
    const result = await toggleSalaListVote(voterId, filmId);
    return { error: null, filmId: result.filmId, voted: result.voted, count: result.count };
  } catch (error) {
    return {
      error:
        error instanceof SalaListError || error instanceof Error
          ? error.message
          : "No pudimos anotar el voto.",
      filmId: null,
      voted: null,
      count: null,
    };
  }
}
