import "server-only";

import { Timestamp, type Transaction } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  memberCanAccessSeats,
  MovieVotingPolicyError,
  planMovieVote,
  resolveMovieBallot,
  type MovieBallotInput,
  type MovieBallotStatus,
  type MovieOptionInput,
} from "@/lib/movie-voting-policy";
import {
  planScreeningOpening,
  ScreeningLifecycleError,
} from "@/lib/screening-lifecycle-policy";
import type { ScreeningStatus } from "@/lib/screenings";

type MovieBallotDocument = {
  screeningId: string;
  status: MovieBallotStatus;
  options: MovieOptionInput[];
  localCloseDate: string;
  localCloseTime: string;
  closesAt: Timestamp;
  counts: Record<string, number>;
  voterCount: number;
  winnerOptionId: string | null;
  decisionOptionIds: string[];
  createdByMemberId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  openedAt: Timestamp | null;
  closedAt: Timestamp | null;
  canceledAt: Timestamp | null;
  resolvedByMemberId?: string | null;
};

type MovieVoteDocument = {
  optionIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type MovieExemptionDocument = {
  memberId: string;
  grantedByMemberId: string;
  createdAt: Timestamp;
};

type ScreeningDocument = {
  startsAt: Timestamp;
  title: string | null;
  status: ScreeningStatus;
  openedAt?: Timestamp | null;
};

export type MovieOption = MovieOptionInput;

export type MovieBallot = {
  id: string;
  screeningId: string;
  status: MovieBallotStatus;
  options: MovieOption[];
  localCloseDate: string;
  localCloseTime: string;
  closesAt: Date;
  counts: Record<string, number>;
  voterCount: number;
  winnerOptionId: string | null;
  decisionOptionIds: string[];
  createdAt: Date;
  updatedAt: Date;
  openedAt: Date | null;
  closedAt: Date | null;
  canceledAt: Date | null;
};

export type MemberMovieBallot = MovieBallot & {
  selection: string[];
  hasVoted: boolean;
  hasExemption: boolean;
  canAccessSeats: boolean;
  showResults: boolean;
};

export type MovieBallotExemption = {
  memberId: string;
  createdAt: Date;
};

export class MovieBallotRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MovieBallotRuleError";
  }
}

function validDocumentId(value: string) {
  return value.length > 0 && value.length <= 100 && !value.includes("/");
}

function validateId(value: string, message: string) {
  if (!validDocumentId(value)) throw new MovieBallotRuleError(message);
}

function ballotFromDocument(id: string, document: MovieBallotDocument): MovieBallot {
  return {
    id,
    screeningId: document.screeningId,
    status: document.status,
    options: document.options,
    localCloseDate: document.localCloseDate,
    localCloseTime: document.localCloseTime,
    closesAt: document.closesAt.toDate(),
    counts: document.counts,
    voterCount: document.voterCount,
    winnerOptionId: document.winnerOptionId,
    decisionOptionIds: document.decisionOptionIds,
    createdAt: document.createdAt.toDate(),
    updatedAt: document.updatedAt.toDate(),
    openedAt: document.openedAt?.toDate() ?? null,
    closedAt: document.closedAt?.toDate() ?? null,
    canceledAt: document.canceledAt?.toDate() ?? null,
  };
}

function newBallotDocument(
  screeningId: string,
  memberId: string,
  input: MovieBallotInput,
  now: Timestamp,
): MovieBallotDocument {
  return {
    screeningId,
    status: "draft",
    options: input.options,
    localCloseDate: input.localCloseDate,
    localCloseTime: input.localCloseTime,
    closesAt: Timestamp.fromDate(input.closesAt),
    counts: Object.fromEntries(input.options.map((option) => [option.id, 0])),
    voterCount: 0,
    winnerOptionId: null,
    decisionOptionIds: [],
    createdByMemberId: memberId,
    createdAt: now,
    updatedAt: now,
    openedAt: null,
    closedAt: null,
    canceledAt: null,
    resolvedByMemberId: null,
  };
}

function assertBallotTiming(input: MovieBallotInput, screening: ScreeningDocument) {
  if (input.closesAt.getTime() >= screening.startsAt.toMillis()) {
    throw new MovieBallotRuleError(
      "La votación tiene que cerrar antes de que empiece la función.",
    );
  }
}

function movieForScreening(option: MovieOption) {
  return {
    title: option.title,
    year: option.year,
    director: option.director,
    bio: option.bio,
  };
}

function applyBallotResolution({
  transaction,
  ballotReference,
  ballot,
  screeningReference,
  pointerReference,
  pointerScreeningId,
  now,
  resolvedByMemberId,
}: {
  transaction: Transaction;
  ballotReference: FirebaseFirestore.DocumentReference;
  ballot: MovieBallotDocument;
  screeningReference: FirebaseFirestore.DocumentReference;
  pointerReference: FirebaseFirestore.DocumentReference;
  pointerScreeningId: unknown;
  now: Timestamp;
  resolvedByMemberId: string | null;
}) {
  let resolution: ReturnType<typeof resolveMovieBallot>;
  try {
    resolution = resolveMovieBallot(
      ballot.options.map((option) => option.id),
      ballot.counts,
    );
  } catch (error) {
    throw new MovieBallotRuleError(
      error instanceof MovieVotingPolicyError
        ? error.message
        : "No pudimos cerrar la votación.",
    );
  }

  if (resolution.kind === "winner") {
    const winner = ballot.options.find(
      (option) => option.id === resolution.winnerOptionId,
    );
    if (!winner) throw new MovieBallotRuleError("No pudimos verificar la película ganadora.");
    transaction.update(ballotReference, {
      status: "closed",
      winnerOptionId: winner.id,
      decisionOptionIds: [],
      closedAt: now,
      updatedAt: now,
      resolvedByMemberId,
    });
    transaction.update(screeningReference, {
      title: winner.title,
      movie: movieForScreening(winner),
      updatedAt: now,
    });
  } else {
    transaction.update(ballotReference, {
      status: "decision",
      winnerOptionId: null,
      decisionOptionIds: resolution.decisionOptionIds,
      closedAt: now,
      updatedAt: now,
      resolvedByMemberId: null,
    });
  }
  if (pointerScreeningId === ballot.screeningId) transaction.delete(pointerReference);
  return resolution;
}

export async function createMovieBallot(
  createdByMemberId: string,
  screeningId: string,
  input: MovieBallotInput,
) {
  validateId(createdByMemberId, "El administrador no es válido.");
  validateId(screeningId, "La función no es válida.");
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const screeningReference = firestore.collection("screenings").doc(screeningId);

  return firestore.runTransaction(async (transaction) => {
    const [ballotSnapshot, screeningSnapshot] = await Promise.all([
      transaction.get(ballotReference),
      transaction.get(screeningReference),
    ]);
    if (ballotSnapshot.exists) {
      throw new MovieBallotRuleError("Esta función ya tiene una cartelera.");
    }
    if (!screeningSnapshot.exists) {
      throw new MovieBallotRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    if (screening.status !== "draft") {
      throw new MovieBallotRuleError("La cartelera solo se puede crear para un borrador.");
    }
    assertBallotTiming(input, screening);

    const document = newBallotDocument(
      screeningId,
      createdByMemberId,
      input,
      Timestamp.now(),
    );
    transaction.create(ballotReference, document);
    return ballotFromDocument(screeningId, document);
  });
}

export async function updateMovieBallot(
  updatedByMemberId: string,
  screeningId: string,
  input: MovieBallotInput,
) {
  validateId(updatedByMemberId, "El administrador no es válido.");
  validateId(screeningId, "La función no es válida.");
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const screeningReference = firestore.collection("screenings").doc(screeningId);

  return firestore.runTransaction(async (transaction) => {
    const [ballotSnapshot, screeningSnapshot] = await Promise.all([
      transaction.get(ballotReference),
      transaction.get(screeningReference),
    ]);
    if (!ballotSnapshot.exists || !screeningSnapshot.exists) {
      throw new MovieBallotRuleError("La cartelera ya no existe.");
    }
    const ballot = ballotSnapshot.data() as MovieBallotDocument;
    const screening = screeningSnapshot.data() as ScreeningDocument;
    if (ballot.status !== "draft" || screening.status !== "draft") {
      throw new MovieBallotRuleError("Una votación abierta ya no se puede editar.");
    }
    assertBallotTiming(input, screening);

    const now = Timestamp.now();
    const next = {
      ...ballot,
      options: input.options,
      localCloseDate: input.localCloseDate,
      localCloseTime: input.localCloseTime,
      closesAt: Timestamp.fromDate(input.closesAt),
      counts: Object.fromEntries(input.options.map((option) => [option.id, 0])),
      voterCount: 0,
      updatedAt: now,
    } satisfies MovieBallotDocument;
    transaction.set(ballotReference, next);
    return ballotFromDocument(screeningId, next);
  });
}

export async function openMovieBallot(screeningId: string, openedByMemberId: string) {
  validateId(screeningId, "La función no es válida.");
  validateId(openedByMemberId, "El administrador no es válido.");
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const ballotPointerReference = firestore.collection("system").doc("openMovieBallot");
  const screeningPointerReference = firestore.collection("system").doc("openScreening");

  return firestore.runTransaction(async (transaction) => {
    const [ballotSnapshot, screeningSnapshot, ballotPointerSnapshot, screeningPointerSnapshot] =
      await Promise.all([
        transaction.get(ballotReference),
        transaction.get(screeningReference),
        transaction.get(ballotPointerReference),
        transaction.get(screeningPointerReference),
      ]);
    if (!ballotSnapshot.exists || !screeningSnapshot.exists) {
      throw new MovieBallotRuleError("La cartelera ya no existe.");
    }
    const ballot = ballotSnapshot.data() as MovieBallotDocument;
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentBallotId = ballotPointerSnapshot.exists
      ? (ballotPointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (
      typeof currentBallotId === "string" &&
      currentBallotId !== screeningId
    ) {
      throw new MovieBallotRuleError("Ya hay otra votación abierta.");
    }
    if (ballot.status === "open" && currentBallotId === screeningId) return false;
    if (ballot.status !== "draft") {
      throw new MovieBallotRuleError("Esta votación ya no se puede abrir.");
    }
    const now = Timestamp.now();
    if (ballot.closesAt.toMillis() <= now.toMillis()) {
      throw new MovieBallotRuleError("La fecha de cierre ya pasó. Editá el borrador.");
    }
    assertBallotTiming(
      {
        options: ballot.options,
        localCloseDate: ballot.localCloseDate,
        localCloseTime: ballot.localCloseTime,
        closesAt: ballot.closesAt.toDate(),
      },
      screening,
    );

    const currentScreeningId = screeningPointerSnapshot.exists
      ? (screeningPointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    let currentScreeningStatus: ScreeningStatus | null = null;
    if (typeof currentScreeningId === "string" && currentScreeningId !== screeningId) {
      const currentScreeningSnapshot = await transaction.get(
        firestore.collection("screenings").doc(currentScreeningId),
      );
      currentScreeningStatus = currentScreeningSnapshot.exists
        ? (currentScreeningSnapshot.data() as ScreeningDocument).status
        : null;
    }
    try {
      planScreeningOpening({
        screeningId,
        status: screening.status,
        currentScreeningId,
        currentScreeningStatus,
      });
    } catch (error) {
      throw new MovieBallotRuleError(
        error instanceof ScreeningLifecycleError
          ? error.message
          : "No pudimos abrir la función.",
      );
    }

    transaction.update(ballotReference, {
      status: "open",
      openedAt: now,
      updatedAt: now,
    });
    transaction.update(screeningReference, {
      status: "open",
      openedAt: screening.openedAt ?? now,
      updatedAt: now,
    });
    transaction.set(ballotPointerReference, { screeningId, updatedAt: now });
    transaction.set(screeningPointerReference, { screeningId, updatedAt: now });
    return true;
  });
}

export async function ensureMovieBallotClosed(screeningId: string) {
  validateId(screeningId, "La función no es válida.");
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openMovieBallot");

  return firestore.runTransaction(async (transaction) => {
    const [ballotSnapshot, screeningSnapshot, pointerSnapshot] = await Promise.all([
      transaction.get(ballotReference),
      transaction.get(screeningReference),
      transaction.get(pointerReference),
    ]);
    if (!ballotSnapshot.exists || !screeningSnapshot.exists) return null;
    const ballot = ballotSnapshot.data() as MovieBallotDocument;
    if (ballot.status !== "open" || ballot.closesAt.toMillis() > Date.now()) return null;
    return applyBallotResolution({
      transaction,
      ballotReference,
      ballot,
      screeningReference,
      pointerReference,
      pointerScreeningId: pointerSnapshot.exists
        ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
        : null,
      now: Timestamp.now(),
      resolvedByMemberId: null,
    });
  });
}

export async function closeMovieBallot(screeningId: string, closedByMemberId: string) {
  validateId(screeningId, "La función no es válida.");
  validateId(closedByMemberId, "El administrador no es válido.");
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openMovieBallot");

  return firestore.runTransaction(async (transaction) => {
    const [ballotSnapshot, screeningSnapshot, pointerSnapshot] = await Promise.all([
      transaction.get(ballotReference),
      transaction.get(screeningReference),
      transaction.get(pointerReference),
    ]);
    if (!ballotSnapshot.exists || !screeningSnapshot.exists) {
      throw new MovieBallotRuleError("La cartelera ya no existe.");
    }
    const ballot = ballotSnapshot.data() as MovieBallotDocument;
    if (ballot.status !== "open") {
      throw new MovieBallotRuleError("Solamente se puede cerrar una votación abierta.");
    }
    return applyBallotResolution({
      transaction,
      ballotReference,
      ballot,
      screeningReference,
      pointerReference,
      pointerScreeningId: pointerSnapshot.exists
        ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
        : null,
      now: Timestamp.now(),
      resolvedByMemberId: closedByMemberId,
    });
  });
}

export async function chooseMovieWinner(
  screeningId: string,
  optionId: string,
  resolvedByMemberId: string,
) {
  validateId(screeningId, "La función no es válida.");
  validateId(optionId, "La película no es válida.");
  validateId(resolvedByMemberId, "El administrador no es válido.");
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const screeningReference = firestore.collection("screenings").doc(screeningId);

  return firestore.runTransaction(async (transaction) => {
    const [ballotSnapshot, screeningSnapshot] = await Promise.all([
      transaction.get(ballotReference),
      transaction.get(screeningReference),
    ]);
    if (!ballotSnapshot.exists || !screeningSnapshot.exists) {
      throw new MovieBallotRuleError("La cartelera ya no existe.");
    }
    const ballot = ballotSnapshot.data() as MovieBallotDocument;
    if (ballot.status !== "decision" || !ballot.decisionOptionIds.includes(optionId)) {
      throw new MovieBallotRuleError("Esa película no está entre las opciones empatadas.");
    }
    const winner = ballot.options.find((option) => option.id === optionId);
    if (!winner) throw new MovieBallotRuleError("No pudimos verificar la película.");

    const now = Timestamp.now();
    transaction.update(ballotReference, {
      status: "closed",
      winnerOptionId: optionId,
      decisionOptionIds: [],
      updatedAt: now,
      resolvedByMemberId,
    });
    transaction.update(screeningReference, {
      title: winner.title,
      movie: movieForScreening(winner),
      updatedAt: now,
    });
    return winner;
  });
}

export async function cancelMovieBallot(screeningId: string, canceledByMemberId: string) {
  validateId(screeningId, "La función no es válida.");
  validateId(canceledByMemberId, "El administrador no es válido.");
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openMovieBallot");

  return firestore.runTransaction(async (transaction) => {
    const [ballotSnapshot, pointerSnapshot] = await Promise.all([
      transaction.get(ballotReference),
      transaction.get(pointerReference),
    ]);
    if (!ballotSnapshot.exists) throw new MovieBallotRuleError("La cartelera ya no existe.");
    const ballot = ballotSnapshot.data() as MovieBallotDocument;
    if (ballot.status === "closed") {
      throw new MovieBallotRuleError("Una votación con ganadora ya no se puede cancelar.");
    }
    if (ballot.status === "canceled") return false;
    const now = Timestamp.now();
    transaction.update(ballotReference, {
      status: "canceled",
      canceledAt: now,
      updatedAt: now,
      resolvedByMemberId: canceledByMemberId,
    });
    const pointerScreeningId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (pointerScreeningId === screeningId) transaction.delete(pointerReference);
    return true;
  });
}

export async function submitMovieVote(
  screeningId: string,
  memberId: string,
  nextSelection: string[],
) {
  validateId(screeningId, "La función no es válida.");
  validateId(memberId, "El miembro no es válido.");
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const voteReference = ballotReference.collection("votes").doc(memberId);
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openMovieBallot");

  return firestore.runTransaction(async (transaction) => {
    const [ballotSnapshot, voteSnapshot, screeningSnapshot, pointerSnapshot] = await Promise.all([
      transaction.get(ballotReference),
      transaction.get(voteReference),
      transaction.get(screeningReference),
      transaction.get(pointerReference),
    ]);
    if (!ballotSnapshot.exists || !screeningSnapshot.exists) {
      throw new MovieBallotRuleError("La votación ya no existe.");
    }
    const ballot = ballotSnapshot.data() as MovieBallotDocument;
    if (ballot.status !== "open") {
      throw new MovieBallotRuleError("La votación ya está cerrada.");
    }
    const now = Timestamp.now();
    if (ballot.closesAt.toMillis() <= now.toMillis()) {
      applyBallotResolution({
        transaction,
        ballotReference,
        ballot,
        screeningReference,
        pointerReference,
        pointerScreeningId: pointerSnapshot.exists
          ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
          : null,
        now,
        resolvedByMemberId: null,
      });
      return { closed: true as const, selection: [] };
    }

    const previousSelection = voteSnapshot.exists
      ? (voteSnapshot.data() as MovieVoteDocument).optionIds
      : [];
    let plan: ReturnType<typeof planMovieVote>;
    try {
      plan = planMovieVote({
        optionIds: ballot.options.map((option) => option.id),
        previousSelection,
        nextSelection,
        counts: ballot.counts,
      });
    } catch (error) {
      throw new MovieBallotRuleError(
        error instanceof MovieVotingPolicyError
          ? error.message
          : "No pudimos guardar tu voto.",
      );
    }

    const vote: MovieVoteDocument = {
      optionIds: plan.selection,
      createdAt: voteSnapshot.exists
        ? (voteSnapshot.data() as MovieVoteDocument).createdAt
        : now,
      updatedAt: now,
    };
    transaction.set(voteReference, vote);
    transaction.update(ballotReference, {
      counts: plan.counts,
      voterCount: ballot.voterCount + Number(plan.isFirstVote),
      updatedAt: now,
    });
    return { closed: false as const, selection: plan.selection };
  });
}

export async function getMemberMovieBallot(
  screeningId: string,
  memberId: string,
): Promise<MemberMovieBallot | null> {
  if (!validDocumentId(screeningId) || !validDocumentId(memberId)) return null;
  await ensureMovieBallotClosed(screeningId);
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const [ballotSnapshot, voteSnapshot, exemptionSnapshot] = await Promise.all([
    ballotReference.get(),
    ballotReference.collection("votes").doc(memberId).get(),
    ballotReference.collection("exemptions").doc(memberId).get(),
  ]);
  if (!ballotSnapshot.exists) return null;
  const ballot = ballotFromDocument(
    ballotSnapshot.id,
    ballotSnapshot.data() as MovieBallotDocument,
  );
  const selection = voteSnapshot.exists
    ? (voteSnapshot.data() as MovieVoteDocument).optionIds.filter((id) =>
        ballot.options.some((option) => option.id === id),
      )
    : [];
  const hasVoted = selection.length > 0;
  const hasExemption = exemptionSnapshot.exists;
  return {
    ...ballot,
    selection,
    hasVoted,
    hasExemption,
    canAccessSeats: memberCanAccessSeats({
      ballotStatus: ballot.status,
      hasVote: hasVoted,
      hasExemption,
    }),
    showResults: hasVoted || ballot.status !== "open",
  };
}

export async function getMovieBallot(screeningId: string): Promise<MovieBallot | null> {
  if (!validDocumentId(screeningId)) return null;
  await ensureMovieBallotClosed(screeningId);
  const snapshot = await getAdminFirestore().collection("movieBallots").doc(screeningId).get();
  return snapshot.exists
    ? ballotFromDocument(snapshot.id, snapshot.data() as MovieBallotDocument)
    : null;
}

export async function closeDueOpenMovieBallot() {
  const firestore = getAdminFirestore();
  const pointerSnapshot = await firestore.collection("system").doc("openMovieBallot").get();
  const screeningId = pointerSnapshot.exists
    ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
    : null;
  if (typeof screeningId !== "string" || !validDocumentId(screeningId)) return null;
  return ensureMovieBallotClosed(screeningId);
}

export async function listMovieBallots(): Promise<MovieBallot[]> {
  await closeDueOpenMovieBallot();
  const snapshot = await getAdminFirestore()
    .collection("movieBallots")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snapshot.docs.map((document) =>
    ballotFromDocument(document.id, document.data() as MovieBallotDocument),
  );
}

export async function getLatestMovieWinner(): Promise<{
  ballot: MovieBallot;
  movie: MovieOption;
} | null> {
  const ballots = await listMovieBallots();
  const ballot = ballots.find(
    (candidate) => candidate.status === "closed" && candidate.winnerOptionId,
  );
  if (!ballot?.winnerOptionId) return null;
  const movie = ballot.options.find((option) => option.id === ballot.winnerOptionId);
  return movie ? { ballot, movie } : null;
}

export async function grantMovieBallotExemption(
  screeningId: string,
  memberId: string,
  grantedByMemberId: string,
) {
  validateId(screeningId, "La función no es válida.");
  validateId(memberId, "El miembro no es válido.");
  validateId(grantedByMemberId, "El administrador no es válido.");
  const firestore = getAdminFirestore();
  const ballotReference = firestore.collection("movieBallots").doc(screeningId);
  const voteReference = ballotReference.collection("votes").doc(memberId);
  const exemptionReference = ballotReference.collection("exemptions").doc(memberId);
  const memberReference = firestore.collection("members").doc(memberId);

  return firestore.runTransaction(async (transaction) => {
    const [ballotSnapshot, voteSnapshot, exemptionSnapshot, memberSnapshot] = await Promise.all([
      transaction.get(ballotReference),
      transaction.get(voteReference),
      transaction.get(exemptionReference),
      transaction.get(memberReference),
    ]);
    if (!ballotSnapshot.exists) throw new MovieBallotRuleError("La cartelera ya no existe.");
    const ballot = ballotSnapshot.data() as MovieBallotDocument;
    if (["draft", "canceled"].includes(ballot.status)) {
      throw new MovieBallotRuleError("Esta cartelera no necesita excepciones.");
    }
    if (!memberSnapshot.exists || (memberSnapshot.data() as { active?: unknown }).active !== true) {
      throw new MovieBallotRuleError("Ese miembro no está activo.");
    }
    if (voteSnapshot.exists) {
      throw new MovieBallotRuleError("Ese miembro ya votó y ya puede elegir asiento.");
    }
    if (exemptionSnapshot.exists) return false;
    transaction.create(exemptionReference, {
      memberId,
      grantedByMemberId,
      createdAt: Timestamp.now(),
    } satisfies MovieExemptionDocument);
    return true;
  });
}

export async function listMovieBallotExemptions(
  screeningId: string,
): Promise<MovieBallotExemption[]> {
  if (!validDocumentId(screeningId)) return [];
  const snapshot = await getAdminFirestore()
    .collection("movieBallots")
    .doc(screeningId)
    .collection("exemptions")
    .limit(500)
    .get();
  return snapshot.docs.map((document) => ({
    memberId: document.id,
    createdAt: (document.data() as MovieExemptionDocument).createdAt.toDate(),
  }));
}
