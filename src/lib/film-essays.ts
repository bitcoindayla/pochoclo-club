import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  EssayPolicyError,
  essayImageUrl,
  isFilmHistoryId,
  parseCriticName,
  parseEssay,
  parseEssayImage,
  readCriticName,
  type EssayImageRecord,
} from "@/lib/essay-policy";
import { getAdminFirestore } from "@/lib/firebase/admin";

export class FilmEssayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilmEssayError";
  }
}

type FilmHistoryEssayDocument = {
  title: string;
  year: number;
  director: string;
  score: number;
  watchedAt: Timestamp;
  essay?: string | null;
  criticName?: string | null;
  essayImage?: EssayImageRecord | null;
};

export type PublicFilmEssay = {
  id: string;
  title: string;
  year: number;
  director: string;
  score: number;
  watchedAt: Date;
  essay: string;
  criticName: string | null;
  imageUrl: string | null;
  portraitUrl: string | null;
  imageVersion: string | null;
  accent: string | null;
};

function publicFrom(id: string, data: FilmHistoryEssayDocument): PublicFilmEssay | null {
  const essay = typeof data.essay === "string" ? data.essay.trim() : "";
  if (!essay) return null;
  const image = parseEssayImage(data.essayImage);
  return {
    id,
    title: data.title,
    year: data.year,
    director: data.director,
    score: data.score,
    watchedAt: data.watchedAt.toDate(),
    essay,
    criticName: readCriticName(data.criticName),
    imageUrl: image ? essayImageUrl(id, image.version, "landscape") : null,
    portraitUrl: image ? essayImageUrl(id, image.version, "portrait") : null,
    imageVersion: image?.version ?? null,
    accent: image?.accent || null,
  };
}

export async function getPublicFilmEssay(filmId: string): Promise<PublicFilmEssay | null> {
  if (!isFilmHistoryId(filmId)) return null;
  const snapshot = await getAdminFirestore().collection("filmHistory").doc(filmId).get();
  if (!snapshot.exists) return null;
  return publicFrom(snapshot.id, snapshot.data() as FilmHistoryEssayDocument);
}

export async function saveFilmEssay(
  filmId: string,
  essayInput: unknown,
  criticInput: unknown,
  file: File | null,
) {
  if (!isFilmHistoryId(filmId)) {
    throw new FilmEssayError("La película no es válida.");
  }
  let essay: string;
  let criticName: string;
  try {
    essay = parseEssay(essayInput);
    criticName = parseCriticName(criticInput);
  } catch (error) {
    throw new FilmEssayError(error instanceof EssayPolicyError ? error.message : "La reseña no es válida.");
  }

  const firestore = getAdminFirestore();
  const reference = firestore.collection("filmHistory").doc(filmId);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new FilmEssayError("No encontramos esa película en el historial.");
  const previous = snapshot.data() as FilmHistoryEssayDocument;
  const previousImage = parseEssayImage(previous.essayImage);

  let nextImage = previousImage;
  if (file && file.size > 0) {
    const { uploadEssayImage } = await import("@/lib/essay-images");
    nextImage = await uploadEssayImage(filmId, file);
  }

  await reference.update({
    essay,
    criticName,
    ...(nextImage ? { essayImage: nextImage } : {}),
    essayUpdatedAt: FieldValue.serverTimestamp(),
  });

  if (previousImage && nextImage && nextImage.version !== previousImage.version) {
    const { deleteEssayImages } = await import("@/lib/essay-images");
    await deleteEssayImages([previousImage.landscapePath, previousImage.portraitPath]);
  }

  return publicFrom(filmId, {
    ...previous,
    essay,
    criticName,
    essayImage: nextImage,
  });
}
