import { parseFestivalMarks, type FestivalMark } from "@/lib/festival-policy";

export type LandingImageRecord = {
  landscapePath: string;
  portraitPath: string;
  version: string;
  accent: string;
  sourceWidth: number;
  sourceHeight: number;
};

export type LandingMovie = {
  title: string;
  year: number;
  director: string;
  awards?: FestivalMark[];
};

export function readLandingMovie(value: unknown): LandingMovie | null {
  if (!value || typeof value !== "object") return null;
  const movie = value as Partial<LandingMovie>;
  if (
    typeof movie.title !== "string" ||
    !movie.title.trim() ||
    typeof movie.director !== "string" ||
    !movie.director.trim() ||
    typeof movie.year !== "number" ||
    !Number.isInteger(movie.year)
  ) {
    return null;
  }
  const awards = parseFestivalMarks(movie.awards);
  return {
    title: movie.title.trim(),
    director: movie.director.trim(),
    year: movie.year,
    ...(awards.length ? { awards } : {}),
  };
}

export function movieWithPreservedAwards(movie: LandingMovie, previous: LandingMovie | null) {
  if (movie.awards?.length) return movie;
  if (previous?.awards?.length && previous.title === movie.title) {
    return { ...movie, awards: previous.awards };
  }
  return movie;
}

export function parseLandingMovie(formData: FormData): LandingMovie {
  const text = (key: string, label: string) => {
    const value = formData.get(key);
    if (typeof value !== "string" || !value.trim() || value.trim().length > 120) {
      throw new Error(`${label}: completá entre 1 y 120 caracteres.`);
    }
    return value.trim();
  };
  const title = text("title", "Película");
  const director = text("director", "Dirección");
  const year = formData.get("year");
  if (typeof year !== "string" || !/^\d{4}$/.test(year.trim()) || Number(year) < 1888 || Number(year) > 2100) {
    throw new Error("Ingresá un año válido, entre 1888 y 2100.");
  }
  return { title, director, year: Number(year) };
}

export const LANDING_IMAGE_PATH =
  /^landing\/[A-Za-z0-9-]{8,80}-(landscape|portrait)\.webp$/;

export function isLandingImagePath(path: string) {
  return LANDING_IMAGE_PATH.test(path);
}

export function landingImageUrls(version: string) {
  const query = `?v=${encodeURIComponent(version)}`;
  return {
    landscape: `/api/landing-image/landscape${query}`,
    portrait: `/api/landing-image/portrait${query}`,
  };
}
