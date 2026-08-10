"use server";

import { revalidatePath } from "next/cache";

import { requireMember } from "@/lib/authz";
import {
  MovieBallotRuleError,
  submitMovieVote,
} from "@/lib/movie-voting";

export type MovieVoteActionState = {
  error: string | null;
  message: string | null;
};

export async function submitMovieVoteAction(
  _previousState: MovieVoteActionState,
  formData: FormData,
): Promise<MovieVoteActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }
  const optionIds = formData
    .getAll("optionId")
    .filter((value): value is string => typeof value === "string");

  try {
    const result = await submitMovieVote(screeningId, member.id, optionIds);
    revalidatePath("/club");
    revalidatePath("/admin/cartelera");
    if (result.closed) {
      return {
        error: "La votación se cerró justo ahora. Actualizamos los resultados.",
        message: null,
      };
    }
    return {
      error: null,
      message: "Voto guardado. Ya podés elegir tu lugar.",
    };
  } catch (error) {
    return {
      error:
        error instanceof MovieBallotRuleError
          ? error.message
          : "No pudimos guardar tu voto. Probá otra vez.",
      message: null,
    };
  }
}
