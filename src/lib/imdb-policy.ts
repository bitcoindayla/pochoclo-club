const IMDB_ID_PATTERN = /\btt\d{7,8}\b/i;

export type ImdbTitle = {
  imdbId: string;
  rating: number | null;
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
