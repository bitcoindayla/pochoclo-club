import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { hasCritiqueAccess } from "@/lib/critique-access";
import type { CritiqueScores } from "@/lib/critique-policy";
import {
  assertRecommendationReveal,
  parseRecommendationSelection,
  recommendationScreeningId,
  RecommendationError,
  type PhoneRecommendations,
  type RecommendationId,
  type RecommendationMovie,
  type RecommendationRound,
} from "@/lib/recommendation-policy";

type RoundDocument = Omit<RecommendationRound, "screeningId">;
type PreferenceMovie = Pick<RecommendationMovie, "id" | "title" | "director" | "year">;
export type MemberRecommendationPreference = {
  screeningId: string;
  watchedTitle: string;
  updatedAt: Date;
  movies: PreferenceMovie[];
};

function roundFrom(screeningId: string, data: RoundDocument): RecommendationRound {
  return {
    screeningId,
    status: data.status,
    movies: data.movies,
    counts: data.counts,
    respondentCount: data.respondentCount,
    revision: data.revision,
  };
}

export async function getRecommendationRound(screeningId: string) {
  recommendationScreeningId(screeningId);
  const snapshot = await getAdminFirestore().collection("recommendations").doc(screeningId).get();
  return snapshot.exists ? roundFrom(screeningId, snapshot.data() as RoundDocument) : null;
}

export async function saveRecommendationMovie(
  screeningId: string,
  movie: RecommendationMovie,
  expectedRevision: number,
) {
  recommendationScreeningId(screeningId);
  const firestore = getAdminFirestore();
  const reference = firestore.collection("recommendations").doc(screeningId);
  await firestore.runTransaction(async (transaction) => {
    const [snapshot, screening] = await Promise.all([
      transaction.get(reference),
      transaction.get(firestore.collection("screenings").doc(screeningId)),
    ]);
    if (!screening.exists) throw new RecommendationError("No encontramos esa función.");
    const previous = snapshot.exists ? snapshot.data() as RoundDocument : null;
    if (previous && previous.status !== "draft") {
      throw new RecommendationError("Las películas ya se mostraron y no se pueden reemplazar.");
    }
    if ((previous?.revision ?? 0) !== expectedRevision) {
      throw new RecommendationError("La selección cambió en otra pantalla. Recargá antes de guardar.");
    }
    const movies = [...(previous?.movies ?? []).filter((row) => row.id !== movie.id), movie]
      .sort((left, right) => left.id.localeCompare(right.id));
    transaction.set(reference, {
      status: "draft",
      movies,
      counts: {},
      respondentCount: 0,
      revision: expectedRevision + 1,
      updatedAt: Timestamp.now(),
    });
  });
}

export async function revealRecommendations(screeningId: string) {
  recommendationScreeningId(screeningId);
  const firestore = getAdminFirestore();
  const reference = firestore.collection("recommendations").doc(screeningId);
  await firestore.runTransaction(async (transaction) => {
    const [snapshot, critique] = await Promise.all([
      transaction.get(reference),
      transaction.get(firestore.collection("critiques").doc(screeningId)),
    ]);
    if (!snapshot.exists) throw new RecommendationError("Primero cargá las tres recomendaciones.");
    const round = snapshot.data() as RoundDocument;
    if (round.status === "open") return;
    if (round.status === "closed") throw new RecommendationError("Esta ronda ya terminó.");
    assertRecommendationReveal(round.movies, critique.data()?.status ?? "");
    transaction.update(reference, { status: "open", revealedAt: Timestamp.now() });
  });
}

export async function closeRecommendations(screeningId: string) {
  recommendationScreeningId(screeningId);
  const firestore = getAdminFirestore();
  const reference = firestore.collection("recommendations").doc(screeningId);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists || snapshot.data()?.status === "draft") {
      throw new RecommendationError("Primero mostrá las recomendaciones.");
    }
    if (snapshot.data()?.status === "closed") return;
    transaction.update(reference, { status: "closed", closedAt: Timestamp.now() });
  });
}

export async function getPhoneRecommendations(
  screeningId: string,
  personId: string | null,
  knownRound?: RecommendationRound | null,
  accessToken?: string,
): Promise<PhoneRecommendations | null> {
  if (!personId) return null;
  const round = knownRound === undefined ? await getRecommendationRound(screeningId) : knownRound;
  if (!round || round.status === "draft") return null;
  const firestore = getAdminFirestore();
  const [response, audience] = await Promise.all([
    firestore.collection("recommendations").doc(screeningId).collection("responses").doc(personId).get(),
    firestore.collection("critiques").doc(screeningId).collection("audience").doc(personId).get(),
  ]);
  if (!hasCritiqueAccess(accessToken, audience.data()?.accessHash)) return null;
  // No live tallies on the phone: people choose independently of the room.
  return { round: { ...round, counts: {}, respondentCount: 0 }, selection: response.data()?.optionIds ?? [] };
}

export async function submitRecommendationPreference(
  screeningId: string,
  personId: string,
  values: unknown[],
  accessToken?: string,
) {
  recommendationScreeningId(screeningId);
  if (!personId || personId.includes("/") || personId.length > 128) {
    throw new RecommendationError("Volvé a identificarte en la sala.");
  }
  const firestore = getAdminFirestore();
  const reference = firestore.collection("recommendations").doc(screeningId);
  const critiqueReference = firestore.collection("critiques").doc(screeningId);
  const responseReference = reference.collection("responses").doc(personId);
  await firestore.runTransaction(async (transaction) => {
    const [snapshot, audience, critique, previousResponse] = await Promise.all([
      transaction.get(reference),
      transaction.get(critiqueReference.collection("audience").doc(personId)),
      transaction.get(critiqueReference),
      transaction.get(responseReference),
    ]);
    if (!snapshot.exists || snapshot.data()?.status !== "open") {
      throw new RecommendationError("La selección de recomendaciones no está abierta.");
    }
    if (!audience.exists || !audience.data()?.submittedAt || critique.data()?.status !== "closed") {
      throw new RecommendationError("Para elegir tenés que haber participado de la crítica.");
    }
    if (!hasCritiqueAccess(accessToken, audience.data()?.accessHash)) {
      throw new RecommendationError("Este teléfono no está identificado para elegir. Volvé a entrar a la crítica.");
    }
    const round = snapshot.data() as RoundDocument;
    const selection = parseRecommendationSelection(values, round.movies);
    const participant = audience.data() as { name: string; memberId: string | null; scores: CritiqueScores };
    const memberReference = participant.memberId
      ? firestore.collection("members").doc(participant.memberId)
      : null;
    const member = memberReference ? await transaction.get(memberReference) : null;
    const previous: RecommendationId[] = previousResponse.data()?.optionIds ?? [];
    const counts = { ...round.counts };
    for (const movie of round.movies) {
      counts[movie.id] = (counts[movie.id] ?? 0)
        - Number(previous.includes(movie.id)) + Number(selection.includes(movie.id));
    }
    const now = Timestamp.now();
    transaction.set(responseReference, {
      name: participant.name,
      memberId: member?.exists ? participant.memberId : null,
      optionIds: selection,
      createdAt: previousResponse.data()?.createdAt ?? now,
      updatedAt: now,
    });
    transaction.update(reference, {
      counts,
      respondentCount: round.respondentCount + (previousResponse.exists ? 0 : 1),
    });
    if (memberReference && member?.exists) {
      const brief = (movie: RecommendationMovie): PreferenceMovie => ({
        id: movie.id, title: movie.title, director: movie.director, year: movie.year,
      });
      transaction.set(memberReference.collection("recommendationPreferences").doc(screeningId), {
        screeningId,
        watchedTitle: critique.data()?.movieTitle ?? "",
        watchedAt: critique.data()?.screeningStartsAt ?? null,
        critiqueScores: participant.scores,
        optionIds: selection,
        movies: round.movies.filter((movie) => selection.includes(movie.id)).map(brief),
        offeredMovies: round.movies.map(brief),
        createdAt: previousResponse.data()?.createdAt ?? now,
        updatedAt: now,
      });
    }
  });
}

export async function listMemberRecommendationPreferences(memberId: string): Promise<MemberRecommendationPreference[]> {
  const snapshot = await getAdminFirestore().collection("members").doc(memberId)
    .collection("recommendationPreferences").orderBy("updatedAt", "desc").limit(100).get();
  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      screeningId: document.id,
      watchedTitle: data.watchedTitle as string,
      updatedAt: (data.updatedAt as Timestamp).toDate(),
      movies: data.movies as PreferenceMovie[],
    };
  });
}
