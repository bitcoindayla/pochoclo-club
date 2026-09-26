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
};

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
