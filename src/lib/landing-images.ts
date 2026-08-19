import "server-only";

import { randomUUID } from "node:crypto";

import { getAdminStorageBucket } from "@/lib/firebase/admin";
import { isLandingImagePath, type LandingImageRecord } from "@/lib/landing-policy";

export class LandingImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LandingImageError";
  }
}

export type { LandingImageRecord };

async function deletePaths(paths: string[]) {
  const bucket = getAdminStorageBucket();
  await Promise.all(
    [...new Set(paths)].map(async (path) => {
      try {
        await bucket.file(path).delete({ ignoreNotFound: true });
      } catch {
        // Una limpieza pendiente no debe invalidar la portada ya guardada.
      }
    }),
  );
}

export async function uploadLandingImage(file: File): Promise<LandingImageRecord> {
  const source = Buffer.from(await file.arrayBuffer());
  const { processMovieImageSource } = await import("@/lib/movie-image-processing");
  let processed: Awaited<ReturnType<typeof processMovieImageSource>>;
  try {
    processed = await processMovieImageSource({ source, mimeType: file.type });
  } catch (error) {
    throw new LandingImageError(
      error instanceof Error ? error.message : "No pudimos preparar esa imagen.",
    );
  }

  const version = randomUUID();
  const landscapePath = `landing/${version}-landscape.webp`;
  const portraitPath = `landing/${version}-portrait.webp`;
  const bucket = getAdminStorageBucket();
  const saveOptions = {
    contentType: "image/webp",
    resumable: false,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  } as const;

  try {
    await Promise.all([
      bucket.file(landscapePath).save(processed.landscape, saveOptions),
      bucket.file(portraitPath).save(processed.portrait, saveOptions),
    ]);
  } catch {
    await deletePaths([landscapePath, portraitPath]);
    throw new LandingImageError(
      "No pudimos guardar la imagen. Revisá que Storage esté activado en Firebase.",
    );
  }

  return {
    landscapePath,
    portraitPath,
    version,
    accent: processed.accent,
    sourceWidth: processed.sourceWidth,
    sourceHeight: processed.sourceHeight,
  };
}

export async function deleteLandingImages(paths: string[]) {
  await deletePaths(paths.filter(isLandingImagePath));
}

export async function downloadLandingImage(path: string) {
  if (!isLandingImagePath(path)) {
    throw new LandingImageError("La imagen no es válida.");
  }
  const [buffer] = await getAdminStorageBucket().file(path).download();
  return buffer;
}
