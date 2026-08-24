import { createHash, randomBytes } from "node:crypto";

export const CRITIQUE_CATEGORIES = [
  { id: "fotografia", label: "Fotografía" },
  { id: "sonido", label: "Sonido" },
  { id: "actuacion", label: "Actuación" },
  { id: "guion", label: "Guion" },
  { id: "direccion", label: "Dirección" },
] as const;

export type CritiqueCategoryId = (typeof CRITIQUE_CATEGORIES)[number]["id"];
export type CritiqueStatus = "lobby" | "scoring" | "closed";
export type CritiqueScores = Record<CritiqueCategoryId, number>;

export class CritiquePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CritiquePolicyError";
  }
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function generateCritiqueToken() {
  return randomBytes(16).toString("base64url");
}

export function isCritiqueToken(token: string) {
  return TOKEN_PATTERN.test(token);
}

export function hashCritiqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function parseScore(value: unknown) {
  const score = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    throw new CritiquePolicyError("Cada categoría se puntúa de 0 a 10.");
  }
  return score;
}

export function parseCritiqueScores(input: Partial<Record<CritiqueCategoryId, unknown>>) {
  const scores = {} as CritiqueScores;
  for (const category of CRITIQUE_CATEGORIES) {
    scores[category.id] = parseScore(input[category.id]);
  }
  return scores;
}

export function spectatorAverage(scores: CritiqueScores) {
  const total = CRITIQUE_CATEGORIES.reduce((sum, category) => sum + scores[category.id], 0);
  return roundScore(total / CRITIQUE_CATEGORIES.length);
}

export function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

export function roomAverages(averages: number[], categoryLists: CritiqueScores[]) {
  if (averages.length === 0) {
    return { room: null, categories: null as CritiqueScores | null };
  }
  const room = roundScore(averages.reduce((sum, value) => sum + value, 0) / averages.length);
  const categories = {} as CritiqueScores;
  for (const category of CRITIQUE_CATEGORIES) {
    const total = categoryLists.reduce((sum, scores) => sum + scores[category.id], 0);
    categories[category.id] = roundScore(total / categoryLists.length);
  }
  return { room, categories };
}

export function parseLegacyFilmScore(value: unknown) {
  const score = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 10) {
    throw new CritiquePolicyError("El puntaje va de 0 a 10.");
  }
  return roundScore(score);
}

export function parseFilmYear(value: unknown) {
  const year = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(year) || year < 1895 || year > 2100) {
    throw new CritiquePolicyError("El año no es válido.");
  }
  return year;
}
