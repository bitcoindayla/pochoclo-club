"use server";

import { cookies } from "next/headers";

import { CRITIQUE_CATEGORIES, type CritiqueCategoryId } from "@/lib/critique-policy";
import { CritiqueError, getCritiqueByToken, joinCritique, parseCritiqueCookie, submitCritiqueScores } from "@/lib/critiques";
import { CRITIQUE_ACCESS_COOKIE, CRITIQUE_COOKIE } from "@/lib/session";
import { submitRecommendationPreference } from "@/lib/recommendations";

export type PhoneCritiqueState = {
  error: string | null;
  message: string | null;
};

function cookieValue(screeningId: string, personId: string) {
  return `${screeningId}::${personId}`;
}

export async function joinCritiqueAction(
  _previous: PhoneCritiqueState,
  formData: FormData,
): Promise<PhoneCritiqueState> {
  const token = formData.get("token");
  const personId = formData.get("personId");
  if (typeof token !== "string" || typeof personId !== "string") {
    return { error: "Elegí tu nombre.", message: null };
  }
  try {
    const cookieStore = await cookies();
    const result = await joinCritique(token, personId, cookieStore.get(CRITIQUE_ACCESS_COOKIE)?.value);
    (await cookies()).set(CRITIQUE_COOKIE, cookieValue(result.session.screeningId, personId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    cookieStore.set(CRITIQUE_ACCESS_COOKIE, result.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return { error: null, message: "Ya estás en la sala." };
  } catch (error) {
    return {
      error: error instanceof CritiqueError || error instanceof Error ? error.message : "No se pudo entrar.",
      message: null,
    };
  }
}

export async function submitScoresAction(
  _previous: PhoneCritiqueState,
  formData: FormData,
): Promise<PhoneCritiqueState> {
  const token = formData.get("token");
  const personId = formData.get("personId");
  if (typeof token !== "string" || typeof personId !== "string") {
    return { error: "Sesión inválida.", message: null };
  }
  const scores = Object.fromEntries(
    CRITIQUE_CATEGORIES.map((category) => [category.id, formData.get(category.id)]),
  ) as Partial<Record<CritiqueCategoryId, unknown>>;
  try {
    await submitCritiqueScores(token, personId, scores);
    return { error: null, message: "Puntaje enviado." };
  } catch (error) {
    return {
      error: error instanceof CritiqueError || error instanceof Error ? error.message : "No se pudo guardar.",
      message: null,
    };
  }
}

export async function submitRecommendationAction(
  _previous: PhoneCritiqueState,
  formData: FormData,
): Promise<PhoneCritiqueState> {
  try {
    const token = formData.get("token");
    const session = typeof token === "string" ? await getCritiqueByToken(token) : null;
    if (!session) throw new CritiqueError("Ese código no está activo.");
    const personId = parseCritiqueCookie((await cookies()).get(CRITIQUE_COOKIE)?.value, session.screeningId);
    if (!personId) throw new CritiqueError("Volvé a identificarte en la sala desde este teléfono.");
    await submitRecommendationPreference(session.screeningId, personId, formData.getAll("movieIds"), (await cookies()).get(CRITIQUE_ACCESS_COOKIE)?.value);
    return { error: null, message: "Tus elecciones quedaron guardadas." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos guardar tus elecciones.", message: null };
  }
}
