import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { landingImageUrls, type LandingImageRecord } from "@/lib/landing-policy";

const LANDING_DOC = ["system", "landing"] as const;

export type LandingVisual = {
  version: string;
  accent: string | null;
  landscapeUrl: string;
  portraitUrl: string;
};

type LandingDocument = LandingImageRecord & {
  updatedBy: string;
};

function visualFrom(record: LandingImageRecord): LandingVisual {
  const urls = landingImageUrls(record.version);
  return {
    version: record.version,
    accent: record.accent ?? null,
    landscapeUrl: urls.landscape,
    portraitUrl: urls.portrait,
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
    });
  } catch {
    return null;
  }
}

export async function saveLandingImage(adminId: string, file: File) {
  const { deleteLandingImages, uploadLandingImage } = await import("@/lib/landing-images");
  const uploaded = await uploadLandingImage(file);
  const reference = getAdminFirestore().doc(LANDING_DOC.join("/"));
  const previous = await reference.get();
  const previousData = previous.exists ? (previous.data() as Partial<LandingDocument>) : null;

  try {
    await reference.set({
      ...uploaded,
      updatedBy: adminId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await deleteLandingImages([uploaded.landscapePath, uploaded.portraitPath]);
    throw error;
  }

  if (previousData?.landscapePath && previousData?.portraitPath) {
    await deleteLandingImages([previousData.landscapePath, previousData.portraitPath]);
  }

  return visualFrom(uploaded);
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
