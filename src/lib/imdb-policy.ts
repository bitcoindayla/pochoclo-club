const IMDB_ID_PATTERN = /\btt\d{7,8}\b/i;
export const MOVIE_BIO_MAX = 360;

export type ImdbTitle = {
  imdbId: string;
  rating: number | null;
};

export type MovieCatalogCard = {
  imdbId: string;
  title: string;
  year: number;
  director: string;
  bio: string;
  imdbRating: number | null;
  imdbUrl: string;
};

export type ImdbSuggestionRow = {
  id: string;
  l: string;
  y?: number;
  qid?: string;
  q?: string;
};

export function parseImdbId(value: string) {
  const match = value.trim().match(IMDB_ID_PATTERN);
  return match ? match[0].toLowerCase() : null;
}

export function imdbTitleUrl(imdbId: string) {
  return `https://www.imdb.com/title/${imdbId}/`;
}

export function formatImdbRating(rating: number) {
  return rating.toFixed(1).replace(".", ",");
}

export function parseImdbRating(value: unknown) {
  const rating = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(rating) || rating < 0 || rating > 10) return null;
  return Math.round(rating * 10) / 10;
}

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function clipMovieBio(value: string, maximum = MOVIE_BIO_MAX) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maximum) return clean;
  const sliced = clean.slice(0, maximum - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

function parseYear(value: unknown) {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  const match = /\b(18|19|20)\d{2}\b/.exec(text);
  if (!match) return null;
  const year = Number(match[0]);
  return year >= 1888 && year <= 2100 ? year : null;
}

function parseDirector(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
    .join(" / ");
}

export function pickImdbSuggestion(
  rows: ImdbSuggestionRow[],
  title: string,
  year?: number | null,
) {
  const wanted = normalizeTitle(title);
  if (!wanted) return null;
  const scored = rows
    .filter((row) => parseImdbId(row.id))
    .filter((row) => row.qid === "movie" || row.q === "feature" || !row.qid)
    .map((row) => {
      const sameYear = year && row.y === year ? 2 : 0;
      const sameTitle = normalizeTitle(row.l) === wanted ? 2 : normalizeTitle(row.l).includes(wanted) ? 1 : 0;
      return { id: parseImdbId(row.id)!, score: sameYear + sameTitle };
    })
    .filter((row) => row.score >= (year ? 2 : 1))
    .sort((left, right) => right.score - left.score);
  return scored[0]?.id ?? null;
}

export function parseCinemetaMovie(payload: unknown): MovieCatalogCard | null {
  if (!payload || typeof payload !== "object" || !("meta" in payload)) return null;
  const meta = (payload as { meta?: Record<string, unknown> }).meta;
  if (!meta || typeof meta !== "object") return null;
  const imdbId = parseImdbId(typeof meta.id === "string" ? meta.id : typeof meta.imdb_id === "string" ? meta.imdb_id : "");
  const title = typeof meta.name === "string" ? meta.name.trim() : "";
  const year = parseYear(meta.year) ?? parseYear(meta.releaseInfo);
  const director = parseDirector(meta.director);
  const bio = typeof meta.description === "string" ? clipMovieBio(meta.description) : "";
  if (!imdbId || !title || !year) return null;
  return {
    imdbId,
    title,
    year,
    director,
    bio,
    imdbRating: parseImdbRating(meta.imdbRating),
    imdbUrl: imdbTitleUrl(imdbId),
  };
}
