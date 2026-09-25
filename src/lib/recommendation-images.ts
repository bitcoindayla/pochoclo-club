import "server-only";

import { randomUUID } from "node:crypto";

import { getAdminStorageBucket } from "@/lib/firebase/admin";
import { processMovieImageSource } from "@/lib/movie-image-processing";
import type { MovieOptionImage } from "@/lib/movie-voting-policy";
import { recommendationId, recommendationScreeningId } from "@/lib/recommendation-policy";

export async function deleteRecommendationImage(image: MovieOptionImage | null) {
  if (!image) return;
  const bucket = getAdminStorageBucket();
  await Promise.allSettled([image.landscapePath, image.portraitPath].map((path) =>
    bucket.file(path).delete({ ignoreNotFound: true }),
  ));
}

export async function uploadRecommendationImage(screeningId: string, movieId: string, file: File) {
  recommendationScreeningId(screeningId);
  recommendationId(movieId);
  const processed = await processMovieImageSource({
    source: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
  });
  const prefix = `recommendations/${screeningId}/${movieId}/${randomUUID()}`;
  const image: MovieOptionImage = {
    landscapePath: `${prefix}-landscape.webp`,
    portraitPath: `${prefix}-portrait.webp`,
    sourceWidth: processed.sourceWidth,
    sourceHeight: processed.sourceHeight,
    accent: processed.accent,
  };
  const bucket = getAdminStorageBucket();
  const results = await Promise.allSettled([
    bucket.file(image.landscapePath).save(processed.landscape, { contentType: "image/webp", resumable: false }),
    bucket.file(image.portraitPath).save(processed.portrait, { contentType: "image/webp", resumable: false }),
  ]);
  if (results.some((result) => result.status === "rejected")) {
    await deleteRecommendationImage(image);
    throw new Error("No pudimos guardar el arte. Probá de nuevo.");
  }
  return image;
}

export async function downloadRecommendationImage(path: string) {
  if (!/^recommendations\/[A-Za-z0-9_-]{1,100}\/pick-[1-3]\/[A-Za-z0-9-]+-(landscape|portrait)\.webp$/.test(path)) {
    throw new Error("Arte inválido.");
  }
  const [buffer] = await getAdminStorageBucket().file(path).download();
  return buffer;
}
