import type { MovieOptionImage } from "./movie-voting-policy";

export const RECOMMENDATION_IDS = ["pick-1", "pick-2", "pick-3"] as const;
export type RecommendationId = (typeof RECOMMENDATION_IDS)[number];
export type RecommendationStatus = "draft" | "open" | "closed";

export type RecommendationMovie = {
  id: RecommendationId;
  title: string;
  director: string;
  year: number | null;
  reason: string;
  image: MovieOptionImage | null;
};

export type RecommendationRound = {
  screeningId: string;
  status: RecommendationStatus;
  movies: RecommendationMovie[];
  counts: Record<string, number>;
  respondentCount: number;
  revision: number;
};

export type PhoneRecommendations = {
  round: RecommendationRound;
  selection: RecommendationId[];
};

export class RecommendationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommendationError";
  }
}

export function recommendationId(value: unknown): RecommendationId {
  if (!RECOMMENDATION_IDS.includes(value as RecommendationId)) {
    throw new RecommendationError("Elegí una de las tres películas.");
  }
  return value as RecommendationId;
}

export function recommendationScreeningId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
    throw new RecommendationError("La función no es válida.");
  }
  return value;
}

export function parseRecommendationMovie(formData: FormData): Omit<RecommendationMovie, "image"> {
  const text = (key: string, label: string, maximum: number) => {
    const value = formData.get(key);
    if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
      throw new RecommendationError(`${label}: completá entre 1 y ${maximum} caracteres.`);
    }
    return value.trim();
  };
  const yearValue = formData.get("year");
  const yearText = typeof yearValue === "string" ? yearValue.trim() : "";
  const year = yearText ? Number(yearText) : null;
  if (year !== null && (!/^\d{4}$/.test(yearText) || year < 1895 || year > 2100)) {
    throw new RecommendationError("El año no es válido.");
  }
  return {
    id: recommendationId(formData.get("movieId")),
    title: text("title", "Título", 120),
    director: text("director", "Dirección", 120),
    year,
    reason: text("reason", "Por qué verla", 360),
  };
}

export function assertRecommendationReveal(movies: RecommendationMovie[], critiqueStatus: string) {
  if (critiqueStatus !== "closed") {
    throw new RecommendationError("Primero cerrá y publicá los puntajes de la crítica.");
  }
  if (movies.length !== 3 || !RECOMMENDATION_IDS.every((id) => movies.some((movie) => movie.id === id))) {
    throw new RecommendationError("Prepará las tres películas antes de mostrarlas.");
  }
  if (movies.some((movie) => !movie.image || !movie.title || !movie.director || !movie.reason)) {
    throw new RecommendationError("Cada película necesita arte, título, dirección y un motivo para verla.");
  }
}

export function parseRecommendationSelection(values: unknown[], movies: RecommendationMovie[]): RecommendationId[] {
  if (values.length < 1 || values.length > 3) {
    throw new RecommendationError("Elegí una, dos o las tres películas.");
  }
  const ids = values.map(recommendationId);
  if (new Set(ids).size !== ids.length || ids.some((id) => !movies.some((movie) => movie.id === id))) {
    throw new RecommendationError("La selección no corresponde a estas recomendaciones.");
  }
  return RECOMMENDATION_IDS.filter((id) => ids.includes(id));
}

export function recommendationImageUrl(
  screeningId: string,
  movie: RecommendationMovie,
  variant: "landscape" | "portrait",
  token?: string,
) {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  const path = variant === "portrait" ? movie.image?.portraitPath : movie.image?.landscapePath;
  if (path) params.set("v", path);
  return `/api/recommendation-images/${screeningId}/${movie.id}/${variant}?${params}`;
}
