"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/authz";
import type { CritiqueCategoryId } from "@/lib/critique-policy";
import {
  addLegacyFilm,
  closeCritiqueSession,
  CritiqueError,
  openCritiqueSession,
  publishOccupancyScores,
  startCritiqueScoring,
} from "@/lib/critiques";

export type CritiqueActionState = {
  error: string | null;
  message: string | null;
};

function refresh() {
  revalidatePath("/admin/critica");
  revalidatePath("/admin/critica/sala");
  revalidatePath("/admin/miembros");
  revalidatePath("/historial");
}

export async function openCritiqueAction(
  _previous: CritiqueActionState,
  formData: FormData,
): Promise<CritiqueActionState> {
  await requireAdmin();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }
  try {
    await openCritiqueSession(screeningId, {
      title: formData.get("title"),
      year: formData.get("year"),
      director: formData.get("director"),
    });
    refresh();
    redirect("/admin/critica/sala");
  } catch (error) {
    return {
      error: error instanceof CritiqueError || error instanceof Error ? error.message : "No se pudo abrir.",
      message: null,
    };
  }
}

export async function startScoringAction(
  _previous: CritiqueActionState,
  formData: FormData,
): Promise<CritiqueActionState> {
  await requireAdmin();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }
  try {
    await startCritiqueScoring(screeningId);
    refresh();
    return { error: null, message: "Empezó la puntuación." };
  } catch (error) {
    return {
      error: error instanceof CritiqueError || error instanceof Error ? error.message : "No se pudo empezar.",
      message: null,
    };
  }
}

export async function closeCritiqueAction(
  _previous: CritiqueActionState,
  formData: FormData,
): Promise<CritiqueActionState> {
  await requireAdmin();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }
  try {
    await closeCritiqueSession(screeningId);
    refresh();
    return { error: null, message: "Crítica publicada en el historial." };
  } catch (error) {
    return {
      error: error instanceof CritiqueError || error instanceof Error ? error.message : "No se pudo cerrar.",
      message: null,
    };
  }
}

export async function publishOccupancyScoresAction(
  _previous: CritiqueActionState,
  formData: FormData,
): Promise<CritiqueActionState> {
  await requireAdmin();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }
  try {
    await publishOccupancyScores(
      screeningId,
      {
        title: formData.get("title"),
        year: formData.get("year"),
        director: formData.get("director"),
      },
      (personId, category: CritiqueCategoryId) => formData.get(`score:${personId}:${category}`),
    );
    refresh();
    return { error: null, message: "Puntajes publicados en el historial." };
  } catch (error) {
    return {
      error:
        error instanceof CritiqueError || error instanceof Error
          ? error.message
          : "No se pudieron guardar los puntajes.",
      message: null,
    };
  }
}

export async function addLegacyFilmAction(
  _previous: CritiqueActionState,
  formData: FormData,
): Promise<CritiqueActionState> {
  await requireAdmin();
  try {
    await addLegacyFilm({
      watchedAt: formData.get("watchedAt"),
      title: formData.get("title"),
      year: formData.get("year"),
      director: formData.get("director"),
      score: formData.get("score"),
    });
    refresh();
    return { error: null, message: "Película agregada al historial." };
  } catch (error) {
    return {
      error: error instanceof CritiqueError || error instanceof Error ? error.message : "No se pudo guardar.",
      message: null,
    };
  }
}
