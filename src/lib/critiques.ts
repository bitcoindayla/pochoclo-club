import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  CRITIQUE_CATEGORIES,
  generateCritiqueToken,
  hashCritiqueToken,
  isCritiqueToken,
  parseCritiqueScores,
  parseFilmYear,
  parseLegacyFilmScore,
  roomAverages,
  spectatorAverage,
  type CritiqueCategoryId,
  type CritiqueScores,
  type CritiqueStatus,
  CritiquePolicyError,
} from "@/lib/critique-policy";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isPlaceCode, type PlaceCode } from "@/lib/room";

export class CritiqueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CritiqueError";
  }
}

type PlaceDocument = {
  memberId: string;
  kind: "self" | "guest";
  bookedByMemberId?: string;
  displayName?: string;
};

type CritiqueDocument = {
  token: string;
  tokenHash: string;
  status: CritiqueStatus;
  movieTitle: string;
  movieYear: number;
  movieDirector: string;
  screeningStartsAt: Timestamp;
  occupantCount: number;
  joinedCount: number;
  submittedCount: number;
  roomAverage: number | null;
  categoryAverages: CritiqueScores | null;
  createdAt: Timestamp;
  scoringAt: Timestamp | null;
  closedAt: Timestamp | null;
};

type AudienceDocument = {
  name: string;
  placeCode: PlaceCode;
  kind: "self" | "guest";
  memberId: string | null;
  joinedAt: Timestamp;
  scores: CritiqueScores | null;
  average: number | null;
  submittedAt: Timestamp | null;
};

type FilmHistoryDocument = {
  screeningId: string | null;
  watchedAt: Timestamp;
  title: string;
  year: number;
  director: string;
  score: number;
  voterCount: number;
  categoryAverages: CritiqueScores | null;
  source: "legacy" | "critique";
  createdAt: Timestamp;
};

export type CritiqueOccupant = {
  personId: string;
  name: string;
  placeCode: PlaceCode;
  kind: "self" | "guest";
  memberId: string | null;
};

export type CritiqueAudience = CritiqueOccupant & {
  joined: boolean;
  submitted: boolean;
  average: number | null;
};

export type CritiqueSession = {
  screeningId: string;
  token: string;
  status: CritiqueStatus;
  movieTitle: string;
  movieYear: number;
  movieDirector: string;
  watchedAt: Date;
  occupantCount: number;
  joinedCount: number;
  submittedCount: number;
  roomAverage: number | null;
  categoryAverages: CritiqueScores | null;
  audience: CritiqueAudience[];
};

export type FilmHistoryEntry = {
  id: string;
  watchedAt: Date;
  title: string;
  year: number;
  director: string;
  score: number;
  voterCount: number;
  categoryAverages: CritiqueScores | null;
  source: "legacy" | "critique";
};

export function parseCritiqueCookie(value: string | undefined, screeningId: string) {
  if (!value) return null;
  const [id, personId] = value.split("::");
  if (id !== screeningId || !personId) return null;
  return personId;
}

function validId(value: string) {
  return value.length > 0 && value.length <= 100 && !value.includes("/");
}

function textField(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new CritiqueError(`${label} es obligatorio.`);
  }
  const text = value.trim();
  if (text.length > maximum) {
    throw new CritiqueError(`${label} puede tener hasta ${maximum} caracteres.`);
  }
  return text;
}

function parseWatchedAt(dateValue: unknown) {
  if (typeof dateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new CritiqueError("Elegí una fecha válida.");
  }
  const watchedAt = new Date(`${dateValue}T12:00:00-03:00`);
  if (Number.isNaN(watchedAt.getTime())) throw new CritiqueError("Elegí una fecha válida.");
  return watchedAt;
}

export async function listScreeningOccupants(screeningId: string): Promise<CritiqueOccupant[]> {
  if (!validId(screeningId)) throw new CritiqueError("La función no es válida.");
  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const [screeningSnapshot, placesSnapshot] = await Promise.all([
    screeningReference.get(),
    screeningReference.collection("places").get(),
  ]);
  if (!screeningSnapshot.exists) throw new CritiqueError("No encontramos esa función.");

  const places = placesSnapshot.docs
    .map((place) => ({ id: place.id, data: place.data() as PlaceDocument }))
    .filter((place) => isPlaceCode(place.id) && typeof place.data.memberId === "string");

  const memberIds = [
    ...new Set(
      places
        .map((place) => (place.data.kind === "guest" ? null : place.data.memberId))
        .filter((id): id is string => typeof id === "string" && validId(id)),
    ),
  ];
  const memberSnapshots = memberIds.length
    ? await firestore.getAll(...memberIds.map((id) => firestore.collection("members").doc(id)))
    : [];
  const memberNames = new Map(
    memberSnapshots.flatMap((snapshot): [string, string][] => {
      if (!snapshot.exists) return [];
      const name = (snapshot.data() as { name?: unknown }).name;
      return typeof name === "string" && name.trim() ? [[snapshot.id, name.trim()]] : [];
    }),
  );

  return places.map((place) => {
    const placeCode = place.id as PlaceCode;
    const kind = place.data.kind === "guest" ? "guest" : "self";
    const name =
      typeof place.data.displayName === "string" && place.data.displayName.trim()
        ? place.data.displayName.trim()
        : memberNames.get(place.data.memberId) ?? (kind === "guest" ? "Invitado" : "Miembro del club");
    return {
      personId: place.data.memberId,
      name,
      placeCode,
      kind,
      memberId: kind === "self" ? place.data.memberId : null,
    };
  });
}

function sessionFrom(
  screeningId: string,
  critique: CritiqueDocument,
  occupants: CritiqueOccupant[],
  audienceDocs: Map<string, AudienceDocument>,
): CritiqueSession {
  return {
    screeningId,
    token: critique.token,
    status: critique.status,
    movieTitle: critique.movieTitle,
    movieYear: critique.movieYear,
    movieDirector: critique.movieDirector,
    watchedAt: critique.screeningStartsAt.toDate(),
    occupantCount: critique.occupantCount,
    joinedCount: critique.joinedCount,
    submittedCount: critique.submittedCount,
    roomAverage: critique.roomAverage,
    categoryAverages: critique.categoryAverages,
    audience: occupants.map((occupant) => {
      const row = audienceDocs.get(occupant.personId);
      return {
        ...occupant,
        joined: Boolean(row),
        submitted: Boolean(row?.submittedAt),
        average: row?.average ?? null,
      };
    }),
  };
}

async function readAudience(screeningId: string) {
  const snapshot = await getAdminFirestore()
    .collection("critiques")
    .doc(screeningId)
    .collection("audience")
    .get();
  return new Map(
    snapshot.docs.map((doc) => [doc.id, doc.data() as AudienceDocument]),
  );
}

export async function getCritiqueSession(screeningId: string): Promise<CritiqueSession | null> {
  if (!validId(screeningId)) return null;
  const snapshot = await getAdminFirestore().collection("critiques").doc(screeningId).get();
  if (!snapshot.exists) return null;
  const occupants = await listScreeningOccupants(screeningId);
  const audience = await readAudience(screeningId);
  return sessionFrom(screeningId, snapshot.data() as CritiqueDocument, occupants, audience);
}

export async function getCritiqueByToken(token: string): Promise<CritiqueSession | null> {
  if (!isCritiqueToken(token)) return null;
  const hash = hashCritiqueToken(token);
  const pointer = await getAdminFirestore().collection("critiqueTokens").doc(hash).get();
  if (!pointer.exists) return null;
  const screeningId = (pointer.data() as { screeningId?: unknown }).screeningId;
  if (typeof screeningId !== "string") return null;
  const session = await getCritiqueSession(screeningId);
  if (!session || session.token !== token) return null;
  return session;
}

export async function openCritiqueSession(
  screeningId: string,
  movie: { title: unknown; year: unknown; director: unknown },
) {
  const occupants = await listScreeningOccupants(screeningId);
  if (occupants.length === 0) {
    throw new CritiqueError("No hay nadie sentado. La crítica se abre con la sala ocupada.");
  }

  const firestore = getAdminFirestore();
  const screeningSnapshot = await firestore.collection("screenings").doc(screeningId).get();
  if (!screeningSnapshot.exists) throw new CritiqueError("No encontramos esa función.");
  const screening = screeningSnapshot.data() as {
    startsAt?: Timestamp;
    movie?: { title?: string; year?: number; director?: string };
    title?: string | null;
  };

  const existing = await firestore.collection("critiques").doc(screeningId).get();
  if (existing.exists) {
    const current = existing.data() as CritiqueDocument;
    if (current.status !== "closed") {
      return getCritiqueSession(screeningId);
    }
    throw new CritiqueError("Esta función ya tiene una crítica publicada.");
  }

  const title = textField(movie.title || screening.movie?.title, "El título", 120);
  const director = textField(movie.director || screening.movie?.director, "La dirección", 80);
  const year = parseFilmYear(movie.year || screening.movie?.year);
  const token = generateCritiqueToken();
  const now = Timestamp.now();

  await firestore.collection("critiques").doc(screeningId).create({
    token,
    tokenHash: hashCritiqueToken(token),
    status: "lobby",
    movieTitle: title,
    movieYear: year,
    movieDirector: director,
    screeningStartsAt: screening.startsAt ?? now,
    occupantCount: occupants.length,
    joinedCount: 0,
    submittedCount: 0,
    roomAverage: null,
    categoryAverages: null,
    createdAt: now,
    scoringAt: null,
    closedAt: null,
  });
  await firestore.collection("critiqueTokens").doc(hashCritiqueToken(token)).create({
    screeningId,
    createdAt: now,
  });

  return getCritiqueSession(screeningId);
}

export async function joinCritique(token: string, personId: string) {
  const session = await getCritiqueByToken(token);
  if (!session) throw new CritiqueError("Ese código no está activo.");
  if (session.status === "closed") throw new CritiqueError("La crítica ya se cerró.");

  const occupant = session.audience.find((row) => row.personId === personId);
  if (!occupant) throw new CritiqueError("Ese nombre no está en la sala de hoy.");
  if (occupant.joined) return { session, personId };

  const firestore = getAdminFirestore();
  const critiqueReference = firestore.collection("critiques").doc(session.screeningId);
  const audienceReference = critiqueReference.collection("audience").doc(personId);

  await firestore.runTransaction(async (transaction) => {
    const [critiqueSnapshot, audienceSnapshot] = await Promise.all([
      transaction.get(critiqueReference),
      transaction.get(audienceReference),
    ]);
    if (!critiqueSnapshot.exists) throw new CritiqueError("La crítica no está activa.");
    if (audienceSnapshot.exists) return;
    const critique = critiqueSnapshot.data() as CritiqueDocument;
    if (critique.status === "closed") throw new CritiqueError("La crítica ya se cerró.");

    const joinedCount = critique.joinedCount + 1;
    const shouldStart = critique.status === "lobby" && joinedCount >= critique.occupantCount;
    transaction.create(audienceReference, {
      name: occupant.name,
      placeCode: occupant.placeCode,
      kind: occupant.kind,
      memberId: occupant.memberId,
      joinedAt: FieldValue.serverTimestamp(),
      scores: null,
      average: null,
      submittedAt: null,
    });
    transaction.update(critiqueReference, {
      joinedCount,
      ...(shouldStart
        ? { status: "scoring", scoringAt: FieldValue.serverTimestamp() }
        : {}),
    });
  });

  const next = await getCritiqueSession(session.screeningId);
  if (!next) throw new CritiqueError("La crítica no está activa.");
  return { session: next, personId };
}

export async function submitCritiqueScores(
  token: string,
  personId: string,
  input: Partial<Record<CritiqueCategoryId, unknown>>,
) {
  const session = await getCritiqueByToken(token);
  if (!session) throw new CritiqueError("Ese código no está activo.");
  if (session.status === "lobby") throw new CritiqueError("Todavía no empezó la puntuación.");
  if (session.status === "closed") throw new CritiqueError("La crítica ya se cerró.");
  if (!session.audience.some((row) => row.personId === personId && row.joined)) {
    throw new CritiqueError("Primero identificáte en la sala.");
  }

  const scores = parseCritiqueScores(input);
  const average = spectatorAverage(scores);
  const firestore = getAdminFirestore();
  const critiqueReference = firestore.collection("critiques").doc(session.screeningId);
  const audienceReference = critiqueReference.collection("audience").doc(personId);

  await firestore.runTransaction(async (transaction) => {
    const [critiqueSnapshot, audienceSnapshot, audienceQuery] = await Promise.all([
      transaction.get(critiqueReference),
      transaction.get(audienceReference),
      transaction.get(critiqueReference.collection("audience")),
    ]);
    if (!critiqueSnapshot.exists || !audienceSnapshot.exists) {
      throw new CritiqueError("Primero identificáte en la sala.");
    }
    const critique = critiqueSnapshot.data() as CritiqueDocument;
    if (critique.status !== "scoring") throw new CritiqueError("Ahora no se puede puntuar.");
    const previous = audienceSnapshot.data() as AudienceDocument;
    transaction.update(audienceReference, {
      scores,
      average,
      submittedAt: FieldValue.serverTimestamp(),
    });

    const others = audienceQuery.docs
      .filter((doc) => doc.id !== personId)
      .map((doc) => doc.data() as AudienceDocument)
      .filter((row) => row.scores && typeof row.average === "number");
    const submitted = [
      ...others,
      { scores, average } as Pick<AudienceDocument, "scores" | "average">,
    ];
    const totals = roomAverages(
      submitted.map((row) => row.average as number),
      submitted.map((row) => row.scores as CritiqueScores),
    );
    transaction.update(critiqueReference, {
      submittedCount: submitted.length,
      roomAverage: totals.room,
      categoryAverages: totals.categories,
    });
  });

  return getCritiqueSession(session.screeningId);
}

export async function startCritiqueScoring(screeningId: string) {
  const session = await getCritiqueSession(screeningId);
  if (!session) throw new CritiqueError("No hay una crítica abierta.");
  if (session.status === "closed") throw new CritiqueError("La crítica ya se cerró.");
  if (session.status === "scoring") return session;
  if (session.joinedCount === 0) {
    throw new CritiqueError("Esperá a que alguien escanee el QR.");
  }
  await getAdminFirestore().collection("critiques").doc(screeningId).update({
    status: "scoring",
    scoringAt: FieldValue.serverTimestamp(),
  });
  return getCritiqueSession(screeningId);
}

export async function closeCritiqueSession(screeningId: string) {
  const session = await getCritiqueSession(screeningId);
  if (!session) throw new CritiqueError("No hay una crítica abierta.");
  if (session.status === "closed") return session;
  if (session.submittedCount === 0) {
    throw new CritiqueError("Nadie puntuó todavía.");
  }

  const firestore = getAdminFirestore();
  const now = Timestamp.now();
  await firestore.collection("critiques").doc(screeningId).update({
    status: "closed",
    closedAt: now,
  });
  await firestore.collection("filmHistory").add({
    screeningId,
    watchedAt: session.watchedAt ? Timestamp.fromDate(session.watchedAt) : now,
    title: session.movieTitle,
    year: session.movieYear,
    director: session.movieDirector,
    score: session.roomAverage,
    voterCount: session.submittedCount,
    categoryAverages: session.categoryAverages,
    source: "critique",
    createdAt: now,
  });
  return getCritiqueSession(screeningId);
}

export async function listFilmHistory(): Promise<FilmHistoryEntry[]> {
  const snapshot = await getAdminFirestore()
    .collection("filmHistory")
    .orderBy("watchedAt", "desc")
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() as FilmHistoryDocument;
    return {
      id: doc.id,
      watchedAt: data.watchedAt.toDate(),
      title: data.title,
      year: data.year,
      director: data.director,
      score: data.score,
      voterCount: data.voterCount,
      categoryAverages: data.categoryAverages,
      source: data.source,
    };
  });
}

export async function addLegacyFilm(input: {
  watchedAt: unknown;
  title: unknown;
  year: unknown;
  director: unknown;
  score: unknown;
}) {
  try {
    const watchedAt = parseWatchedAt(input.watchedAt);
    const title = textField(input.title, "El título", 120);
    const director = textField(input.director, "La dirección", 80);
    const year = parseFilmYear(input.year);
    const score = parseLegacyFilmScore(input.score);
    await getAdminFirestore().collection("filmHistory").add({
      screeningId: null,
      watchedAt: Timestamp.fromDate(watchedAt),
      title,
      year,
      director,
      score,
      voterCount: 0,
      categoryAverages: null,
      source: "legacy",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof CritiquePolicyError) throw new CritiqueError(error.message);
    throw error;
  }
}
