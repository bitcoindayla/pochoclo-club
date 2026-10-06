export const MIN_ESSAY_CHARS = 40;
export const MAX_ESSAY_CHARS = 8000;

export class EssayPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EssayPolicyError";
  }
}

export type EssayImageRecord = {
  landscapePath: string;
  portraitPath: string;
  version: string;
  accent: string;
  sourceWidth: number;
  sourceHeight: number;
};

export const ESSAY_IMAGE_PATH =
  /^essays\/[A-Za-z0-9_-]{1,100}\/[A-Za-z0-9-]{8,80}-(landscape|portrait)\.webp$/;

export function isFilmHistoryId(value: string) {
  return value.length > 0 && value.length <= 100 && !value.includes("/");
}

export function isEssayImagePath(path: string) {
  return ESSAY_IMAGE_PATH.test(path);
}

export function parseEssay(value: unknown) {
  if (typeof value !== "string") {
    throw new EssayPolicyError("Escribí la reseña de la película.");
  }
  const essay = value.replace(/\r\n/g, "\n").trim();
  if (essay.length < MIN_ESSAY_CHARS) {
    throw new EssayPolicyError(`La reseña necesita al menos ${MIN_ESSAY_CHARS} caracteres.`);
  }
  if (essay.length > MAX_ESSAY_CHARS) {
    throw new EssayPolicyError(`La reseña puede tener hasta ${MAX_ESSAY_CHARS} caracteres.`);
  }
  return essay;
}

export function parseEssayImage(value: unknown): EssayImageRecord | null {
  if (!value || typeof value !== "object") return null;
  const image = value as Partial<EssayImageRecord>;
  if (
    typeof image.landscapePath !== "string" ||
    typeof image.portraitPath !== "string" ||
    typeof image.version !== "string" ||
    !isEssayImagePath(image.landscapePath) ||
    !isEssayImagePath(image.portraitPath)
  ) {
    return null;
  }
  return {
    landscapePath: image.landscapePath,
    portraitPath: image.portraitPath,
    version: image.version,
    accent: typeof image.accent === "string" ? image.accent : "",
    sourceWidth: typeof image.sourceWidth === "number" ? image.sourceWidth : 0,
    sourceHeight: typeof image.sourceHeight === "number" ? image.sourceHeight : 0,
  };
}

export function essayImageUrl(filmId: string, version?: string | null, variant: "landscape" | "portrait" = "landscape") {
  const query = new URLSearchParams({ variant });
  if (version) query.set("v", version);
  return `/api/essay-image/${encodeURIComponent(filmId)}?${query.toString()}`;
}

export function formatClubScore(score: number) {
  return score.toFixed(1).replace(".", ",");
}

export function essayShareText({
  title,
  year,
  director,
  score,
  url,
}: {
  title: string;
  year: number;
  director: string;
  score: number;
  url: string;
}) {
  return `${title} (${year})\n${director}\nPuntaje de la sala: ${formatClubScore(score)}\n${url}`;
}

export function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function essayExcerpt(essay: string, maximum = 160) {
  const compact = essay.replace(/\s+/g, " ").trim();
  if (compact.length <= maximum) return compact;
  return `${compact.slice(0, maximum - 1).trimEnd()}…`;
}
