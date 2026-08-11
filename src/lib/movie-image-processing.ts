import sharp, { type Metadata } from "sharp";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
export const MAX_MOVIE_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 40_000_000;
const MIN_LONG_EDGE = 640;
const MIN_SHORT_EDGE = 360;

export class MovieImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MovieImageProcessingError";
  }
}

function sourceDimensions(metadata: Metadata) {
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const rotated = typeof metadata.orientation === "number" && metadata.orientation >= 5;
  return rotated ? { width: height, height: width } : { width, height };
}

function visibleAccent({ r, g, b }: { r: number; g: number; b: number }) {
  const brightest = Math.max(r, g, b);
  const mix = brightest < 150 ? 0.42 : 0.14;
  const lift = (channel: number) => Math.round(channel + (255 - channel) * mix);
  return `rgb(${lift(r)} ${lift(g)} ${lift(b)})`;
}

export async function processMovieImageSource({
  source,
  mimeType,
}: {
  source: Buffer;
  mimeType: string;
}) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new MovieImageProcessingError("La imagen debe ser JPG, PNG o WebP.");
  }
  if (source.byteLength > MAX_MOVIE_IMAGE_BYTES) {
    throw new MovieImageProcessingError("La imagen puede pesar hasta 3 MB.");
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(source, {
      animated: false,
      failOn: "error",
      limitInputPixels: MAX_SOURCE_PIXELS,
    }).metadata();
  } catch {
    throw new MovieImageProcessingError(
      "No pudimos leer esa imagen. Probá con otro archivo.",
    );
  }
  if (
    !metadata.format ||
    !ALLOWED_FORMATS.has(metadata.format) ||
    (metadata.pages ?? 1) > 1
  ) {
    throw new MovieImageProcessingError(
      "La imagen debe ser un JPG, PNG o WebP sin animación.",
    );
  }

  const { width, height } = sourceDimensions(metadata);
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  if (longEdge < MIN_LONG_EDGE || shortEdge < MIN_SHORT_EDGE) {
    throw new MovieImageProcessingError(
      "La imagen es muy chica. Usá una de al menos 640 × 360 px.",
    );
  }

  try {
    const pipeline = sharp(source, {
      animated: false,
      failOn: "error",
      limitInputPixels: MAX_SOURCE_PIXELS,
    }).rotate();
    const [landscape, portrait, stats] = await Promise.all([
      pipeline
        .clone()
        .resize(1920, 1080, { fit: "cover", position: sharp.strategy.attention })
        .webp({ quality: 84, effort: 5 })
        .toBuffer(),
      pipeline
        .clone()
        .resize(864, 1080, { fit: "cover", position: sharp.strategy.attention })
        .webp({ quality: 84, effort: 5 })
        .toBuffer(),
      pipeline.clone().stats(),
    ]);

    return {
      landscape,
      portrait,
      sourceWidth: width,
      sourceHeight: height,
      accent: visibleAccent(stats.dominant),
    };
  } catch {
    throw new MovieImageProcessingError(
      "No pudimos preparar esa imagen. Probá con otro archivo.",
    );
  }
}
