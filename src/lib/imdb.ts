import "server-only";

import {
  parseCinemetaMovie,
  parseImdbId,
  pickImdbSuggestion,
  type ImdbSuggestionRow,
  type ImdbTitle,
  type MovieCatalogCard,
} from "@/lib/imdb-policy";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function readJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as unknown;
}

function suggestionQuery(title: string) {
  const compact = normalize(title).replace(/\s+/g, " ");
  const first = compact[0] && /[a-z0-9]/.test(compact[0]) ? compact[0] : "x";
  return `https://v3.sg.media-imdb.com/suggestion/${first}/${encodeURIComponent(compact)}.json`;
}

export async function lookupImdbTitle(title: string, year: number, hint?: string): Promise<ImdbTitle | null> {
  const hinted = hint ? parseImdbId(hint) : null;
  const imdbId = hinted ?? (await searchImdbId(title, year));
  if (!imdbId) return null;
  const rating = await lookupImdbRating(imdbId);
  return { imdbId, rating };
}

async function searchImdbId(title: string, year?: number | null) {
  const payload = await readJson(suggestionQuery(title));
  if (!payload || typeof payload !== "object" || !("d" in payload) || !Array.isArray(payload.d)) {
    return null;
  }
  const movies = payload.d.filter((row): row is ImdbSuggestionRow => {
    return Boolean(row) && typeof row === "object" && typeof (row as { id?: unknown }).id === "string";
  });
  return pickImdbSuggestion(movies, title, year);
}

async function loadCinemeta(imdbId: string) {
  return readJson(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`);
}

async function lookupImdbRating(imdbId: string) {
  const movie = parseCinemetaMovie(await loadCinemeta(imdbId));
  return movie?.imdbRating ?? null;
}

export async function lookupMovieCatalog(
  title: string,
  year?: number | null,
): Promise<MovieCatalogCard | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const imdbId = parseImdbId(trimmed) ?? (await searchImdbId(trimmed, year));
  if (!imdbId) return null;
  return parseCinemetaMovie(await loadCinemeta(imdbId));
}

export async function enrichMovieImdb<T extends { title: string; year: number; imdbId?: string | null; imdbRating?: number | null }>(
  movie: T,
  hint?: string,
): Promise<T> {
  if (movie.imdbId && movie.imdbRating != null) return movie;
  try {
    const found = await lookupImdbTitle(movie.title, movie.year, hint || movie.imdbId || undefined);
    if (!found) return movie;
    return {
      ...movie,
      imdbId: movie.imdbId || found.imdbId,
      imdbRating: movie.imdbRating ?? found.rating,
    };
  } catch {
    return movie;
  }
}
