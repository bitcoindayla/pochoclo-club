import "server-only";

import { randomUUID } from "node:crypto";

import { getAdminStorageBucket } from "@/lib/firebase/admin";
import {
  MAX_MOVIE_IMAGE_BYTES,
  MovieImageProcessingError,
  processMovieImageSource,
} from "@/lib/movie-image-processing";
import type {
  MovieBallotInput,
  MovieOptionImage,
  MovieOptionInput,
} from "@/lib/movie-voting-policy";

export class MovieImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MovieImageError";
  }
}

function safeSegment(value: string, label: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
    throw new MovieImageError(`${label} no es válido.`);
  }
  return value;
}

function fileFrom(formData: FormData, optionId: string) {
  const position = optionId.replace("movie-", "");
  const value = formData.get(`movieImage${position}`);
  return value instanceof File && value.size > 0 ? value : null;
}

function imagePaths(image: MovieOptionImage | null | undefined) {
  return image ? [image.landscapePath, image.portraitPath] : [];
}

async function deletePaths(paths: string[]) {
  const bucket = getAdminStorageBucket();
  await Promise.all(
    [...new Set(paths)].map(async (path) => {
      try {
        await bucket.file(path).delete({ ignoreNotFound: true });
      } catch {
        // Una limpieza pendiente no debe invalidar una cartelera ya guardada.
      }
    }),
  );
}

async function uploadMovieImage(
  screeningId: string,
  optionId: string,
  file: File,
): Promise<MovieOptionImage> {
  safeSegment(screeningId, "La función");
  safeSegment(optionId, "La película");
  const source = Buffer.from(await file.arrayBuffer());
  let processed: Awaited<ReturnType<typeof processMovieImageSource>>;
  try {
    processed = await processMovieImageSource({ source, mimeType: file.type });
  } catch (error) {
    throw new MovieImageError(
      error instanceof MovieImageProcessingError
        ? error.message
        : "No pudimos preparar esa imagen.",
    );
  }

  const version = randomUUID();
  const basePath = `movie-ballots/${screeningId}/${optionId}/${version}`;
  const landscapePath = `${basePath}-landscape.webp`;
  const portraitPath = `${basePath}-portrait.webp`;
  const bucket = getAdminStorageBucket();
  const saveOptions = {
    contentType: "image/webp",
    resumable: false,
    metadata: { cacheControl: "private, max-age=31536000, immutable" },
  } as const;

  try {
    await Promise.all([
      bucket.file(landscapePath).save(processed.landscape, saveOptions),
      bucket.file(portraitPath).save(processed.portrait, saveOptions),
    ]);
  } catch {
    await deletePaths([landscapePath, portraitPath]);
    throw new MovieImageError(
      "No pudimos guardar la imagen. Revisá que Storage esté activado en Firebase.",
    );
  }

  return {
    landscapePath,
    portraitPath,
    sourceWidth: processed.sourceWidth,
    sourceHeight: processed.sourceHeight,
    accent: processed.accent,
  };
}

export async function prepareMovieBallotImages({
  screeningId,
  input,
  formData,
  previousOptions = [],
}: {
  screeningId: string;
  input: MovieBallotInput;
  formData: FormData;
  previousOptions?: MovieOptionInput[];
}) {
  const previousById = new Map(previousOptions.map((option) => [option.id, option]));
  const uploadedPaths: string[] = [];
  const stalePaths: string[] = [];
  const options: MovieOptionInput[] = [];
  const totalUploadBytes = input.options.reduce(
    (total, option) => total + (fileFrom(formData, option.id)?.size ?? 0),
    0,
  );
  if (totalUploadBytes > MAX_MOVIE_IMAGE_BYTES) {
    throw new MovieImageError(
      "Las imágenes de este guardado superan 3 MB en total. Cargalas de a una.",
    );
  }

  try {
    for (const option of input.options) {
      const previousImage = previousById.get(option.id)?.image;
      const file = fileFrom(formData, option.id);
      if (!file) {
        options.push({ ...option, image: previousImage ?? null });
        continue;
      }
      const image = await uploadMovieImage(screeningId, option.id, file);
      uploadedPaths.push(...imagePaths(image));
      stalePaths.push(...imagePaths(previousImage));
      options.push({ ...option, image });
    }
  } catch (error) {
    await deletePaths(uploadedPaths);
    throw error;
  }

  const nextIds = new Set(input.options.map((option) => option.id));
  for (const previous of previousOptions) {
    if (!nextIds.has(previous.id)) stalePaths.push(...imagePaths(previous.image));
  }

  return {
    input: { ...input, options },
    rollback: () => deletePaths(uploadedPaths),
    cleanup: () => deletePaths(stalePaths),
  };
}

export async function downloadMovieImage(path: string) {
  if (!/^movie-ballots\/[A-Za-z0-9_-]{1,100}\/movie-[1-5]\/[A-Za-z0-9-]+-(landscape|portrait)\.webp$/.test(path)) {
    throw new MovieImageError("La imagen no es válida.");
  }
  const [buffer] = await getAdminStorageBucket().file(path).download();
  return buffer;
}
