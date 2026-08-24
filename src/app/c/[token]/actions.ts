"use server";

import { cookies } from "next/headers";

import { CRITIQUE_CATEGORIES, type CritiqueCategoryId } from "@/lib/critique-policy";
import { CritiqueError, joinCritique, submitCritiqueScores } from "@/lib/critiques";
import { CRITIQUE_COOKIE } from "@/lib/session";

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
    const result = await joinCritique(token, personId);
    (await cookies()).set(CRITIQUE_COOKIE, cookieValue(result.session.screeningId, personId), {
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
