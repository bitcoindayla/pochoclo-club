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
