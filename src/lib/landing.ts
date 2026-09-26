import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { landingImageUrls, type LandingImageRecord, type LandingMovie } from "@/lib/landing-policy";

const LANDING_DOC = ["system", "landing"] as const;

export type LandingVisual = {
  version: string;
  accent: string | null;
  landscapeUrl: string;
  portraitUrl: string;
  movie: LandingMovie | null;
};

type LandingDocument = LandingImageRecord & {
  updatedBy: string;
  movie?: LandingMovie;
};

function visualFrom(record: LandingImageRecord & { movie?: LandingMovie }): LandingVisual {
  const urls = landingImageUrls(record.version);
  return {
    version: record.version,
    accent: record.accent ?? null,
    landscapeUrl: urls.landscape,
    portraitUrl: urls.portrait,
    movie: record.movie ?? null,
  };
}

export async function getLandingVisual(): Promise<LandingVisual | null> {
  try {
    const snapshot = await getAdminFirestore().doc(LANDING_DOC.join("/")).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() as Partial<LandingDocument>;
    if (!data.landscapePath || !data.portraitPath || !data.version) return null;
    return visualFrom({
      landscapePath: data.landscapePath,
      portraitPath: data.portraitPath,
      version: data.version,
      accent: data.accent ?? "",
      sourceWidth: data.sourceWidth ?? 0,
      sourceHeight: data.sourceHeight ?? 0,
      movie: data.movie,
    });
  } catch {
    return null;
  }
}

export async function saveLandingImage(
  adminId: string,
  file: File | null,
  movie: LandingMovie,
  expectedVersion: string,
) {
  const { deleteLandingImages, uploadLandingImage } = await import("@/lib/landing-images");
  const uploaded = file ? await uploadLandingImage(file) : null;
  const database = getAdminFirestore();
  const reference = database.doc(LANDING_DOC.join("/"));
  let result;

  try {
    result = await database.runTransaction(async (transaction) => {
      const previous = await transaction.get(reference);
      const previousData = previous.exists ? previous.data() as LandingDocument : null;
      if ((previousData?.version ?? "") !== expectedVersion) {
        throw new Error("La portada cambió. Cerrá y volvé a abrir el editor antes de guardar.");
      }
      const image = uploaded ?? previousData;
      if (!image) throw new Error("Elegí una foto para la portada.");
      const next = { ...image, movie };
      transaction.set(reference, {
        ...next,
        updatedBy: adminId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { previousData, next };
    });
  } catch (error) {
    if (uploaded) await deleteLandingImages([uploaded.landscapePath, uploaded.portraitPath]);
    throw error;
  }

  const { previousData, next } = result;
  if (uploaded && previousData?.landscapePath && previousData?.portraitPath) {
    await deleteLandingImages([previousData.landscapePath, previousData.portraitPath]);
  }

  return visualFrom(next);
}

export async function clearLandingImage() {
  const { deleteLandingImages } = await import("@/lib/landing-images");
  const reference = getAdminFirestore().doc(LANDING_DOC.join("/"));
  const previous = await reference.get();
  const previousData = previous.exists ? (previous.data() as Partial<LandingDocument>) : null;
  await reference.delete();
  if (previousData?.landscapePath && previousData?.portraitPath) {
    await deleteLandingImages([previousData.landscapePath, previousData.portraitPath]);
  }
}
