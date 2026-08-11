"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import { prepareMovieBallotImages } from "@/lib/movie-images";
import {
  cancelMovieBallot,
  chooseMovieWinner,
  closeMovieBallot,
  createMovieBallot,
  grantMovieBallotExemption,
  getMovieBallot,
  MovieBallotRuleError,
  openMovieBallot,
  updateMovieBallot,
} from "@/lib/movie-voting";
import {
  MovieVotingPolicyError,
  parseMovieBallotInput,
} from "@/lib/movie-voting-policy";

export type MovieBallotActionState = {
  error: string | null;
  message: string | null;
};

function screeningIdFrom(formData: FormData) {
  const value = formData.get("screeningId");
  if (typeof value !== "string" || !value) {
    throw new MovieBallotRuleError("Elegí una función válida.");
  }
  return value;
}

function refreshBallotPages() {
  revalidatePath("/admin/cartelera");
  revalidatePath("/admin/funciones");
  revalidatePath("/admin/ocupacion");
  revalidatePath("/club");
}

function actionError(error: unknown, fallback: string): MovieBallotActionState {
  return {
    error:
      error instanceof MovieBallotRuleError ||
      error instanceof MovieVotingPolicyError ||
      error instanceof Error
        ? error.message
        : fallback,
    message: null,
  };
}

export async function createMovieBallotAction(
  _previousState: MovieBallotActionState,
  formData: FormData,
): Promise<MovieBallotActionState> {
  const admin = await requireAdmin();
  try {
    const screeningId = screeningIdFrom(formData);
    const prepared = await prepareMovieBallotImages({
      screeningId,
      input: parseMovieBallotInput(formData),
      formData,
    });
    try {
      await createMovieBallot(admin.id, screeningId, prepared.input);
    } catch (error) {
      await prepared.rollback();
      throw error;
    }
    await prepared.cleanup();
    refreshBallotPages();
    return { error: null, message: "Cartelera guardada como borrador." };
  } catch (error) {
    return actionError(error, "No pudimos crear la cartelera.");
  }
}

export async function updateMovieBallotAction(
  _previousState: MovieBallotActionState,
  formData: FormData,
): Promise<MovieBallotActionState> {
  const admin = await requireAdmin();
  try {
    const screeningId = screeningIdFrom(formData);
    const ballot = await getMovieBallot(screeningId);
    if (!ballot || ballot.status !== "draft") {
      throw new MovieBallotRuleError("Una votación abierta ya no se puede editar.");
    }
    const prepared = await prepareMovieBallotImages({
      screeningId,
      input: parseMovieBallotInput(formData),
      formData,
      previousOptions: ballot.options,
    });
    try {
      await updateMovieBallot(admin.id, screeningId, prepared.input);
    } catch (error) {
      await prepared.rollback();
      throw error;
    }
    await prepared.cleanup();
    refreshBallotPages();
    return { error: null, message: "Borrador actualizado." };
  } catch (error) {
    return actionError(error, "No pudimos actualizar la cartelera.");
  }
}

export async function openMovieBallotAction(
  _previousState: MovieBallotActionState,
  formData: FormData,
): Promise<MovieBallotActionState> {
  const admin = await requireAdmin();
  try {
    await openMovieBallot(screeningIdFrom(formData), admin.id);
    refreshBallotPages();
    return { error: null, message: "Votación y reservas abiertas." };
  } catch (error) {
    return actionError(error, "No pudimos abrir la votación.");
  }
}

export async function closeMovieBallotAction(
  _previousState: MovieBallotActionState,
  formData: FormData,
): Promise<MovieBallotActionState> {
  const admin = await requireAdmin();
  try {
    const resolution = await closeMovieBallot(screeningIdFrom(formData), admin.id);
    refreshBallotPages();
    return resolution.kind === "winner"
      ? { error: null, message: "Votación cerrada y película ganadora asignada." }
      : { error: null, message: "Hay un empate: elegí la ganadora entre las finalistas." };
  } catch (error) {
    return actionError(error, "No pudimos cerrar la votación.");
  }
}

export async function cancelMovieBallotAction(
  _previousState: MovieBallotActionState,
  formData: FormData,
): Promise<MovieBallotActionState> {
  const admin = await requireAdmin();
  try {
    await cancelMovieBallot(screeningIdFrom(formData), admin.id);
    refreshBallotPages();
    return {
      error: null,
      message: "Votación cancelada. La función quedó habilitada como función especial.",
    };
  } catch (error) {
    return actionError(error, "No pudimos cancelar la votación.");
  }
}

export async function chooseMovieWinnerAction(
  _previousState: MovieBallotActionState,
  formData: FormData,
): Promise<MovieBallotActionState> {
  const admin = await requireAdmin();
  const optionId = formData.get("optionId");
  if (typeof optionId !== "string") {
    return { error: "Elegí una película.", message: null };
  }
  try {
    const winner = await chooseMovieWinner(
      screeningIdFrom(formData),
      optionId,
      admin.id,
    );
    refreshBallotPages();
    return { error: null, message: `${winner.title} quedó como ganadora.` };
  } catch (error) {
    return actionError(error, "No pudimos elegir la ganadora.");
  }
}

export async function grantMovieBallotExemptionAction(
  _previousState: MovieBallotActionState,
  formData: FormData,
): Promise<MovieBallotActionState> {
  const admin = await requireAdmin();
  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId) {
    return { error: "Elegí un miembro.", message: null };
  }
  try {
    const granted = await grantMovieBallotExemption(
      screeningIdFrom(formData),
      memberId,
      admin.id,
    );
    refreshBallotPages();
    return {
      error: null,
      message: granted ? "Excepción concedida." : "Ese miembro ya tenía una excepción.",
    };
  } catch (error) {
    return actionError(error, "No pudimos conceder la excepción.");
  }
}
