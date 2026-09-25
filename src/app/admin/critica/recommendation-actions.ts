"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import { deleteRecommendationImage, uploadRecommendationImage } from "@/lib/recommendation-images";
import { parseRecommendationMovie, recommendationScreeningId } from "@/lib/recommendation-policy";
import {
  closeRecommendations,
  getRecommendationRound,
  revealRecommendations,
  saveRecommendationMovie,
} from "@/lib/recommendations";

export type RecommendationActionState = { error: string | null; message: string | null };

function refresh() {
  revalidatePath("/admin/critica");
  revalidatePath("/admin/critica/sala");
}

export async function saveRecommendationMovieAction(
  _previous: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  await requireAdmin();
  try {
    const screeningId = recommendationScreeningId(formData.get("screeningId"));
    const input = parseRecommendationMovie(formData);
    const revision = Number(formData.get("revision"));
    const round = await getRecommendationRound(screeningId);
    if (!Number.isSafeInteger(revision) || revision < 0 || revision !== (round?.revision ?? 0)) {
      return { error: "Las recomendaciones cambiaron. Recargá la página antes de guardar.", message: null };
    }
    if (round && round.status !== "draft") {
      return { error: "Las recomendaciones ya se mostraron. No se pueden editar.", message: null };
    }
    const previousImage = round?.movies.find((movie) => movie.id === input.id)?.image ?? null;
    const file = formData.get("image");
    const uploaded = file instanceof File && file.size > 0
      ? await uploadRecommendationImage(screeningId, input.id, file)
      : null;
    try {
      await saveRecommendationMovie(screeningId, { ...input, image: uploaded ?? previousImage }, revision);
    } catch (error) {
      await deleteRecommendationImage(uploaded);
      throw error;
    }
    if (uploaded) await deleteRecommendationImage(previousImage);
    refresh();
    return { error: null, message: `${input.title} guardada.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos guardar la película.", message: null };
  }
}

export async function revealRecommendationsAction(
  _previous: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  await requireAdmin();
  try {
    await revealRecommendations(recommendationScreeningId(formData.get("screeningId")));
    refresh();
    return { error: null, message: "Pochoclo Recomienda ya está en la pantalla y en los teléfonos." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos mostrar las películas.", message: null };
  }
}

export async function closeRecommendationsAction(
  _previous: RecommendationActionState,
  formData: FormData,
): Promise<RecommendationActionState> {
  await requireAdmin();
  try {
    await closeRecommendations(recommendationScreeningId(formData.get("screeningId")));
    refresh();
    return { error: null, message: "Selección cerrada. Las preferencias quedaron guardadas." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos cerrar la selección.", message: null };
  }
}
