import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { GuestNameError, parseGuestName } from "@/lib/guest-policy";
import type { Member } from "@/lib/members";
import {
  planPromotions,
  type PromotionOccupant,
  type PromotionWaitEntry,
} from "@/lib/promotion-policy";
import { ALL_PLACE_CODES, isPlaceCode, type PlaceCode } from "@/lib/room";
import {
  planScreeningClosure,
  planScreeningOpening,
  ScreeningLifecycleError,
} from "@/lib/screening-lifecycle-policy";
import type { ScreeningInput } from "@/lib/screening-policy";
import {
  claimWaitlistSlot,
  releaseWaitlistSlots,
  WaitlistFullError,
  type WaitlistState,
} from "@/lib/waitlist-policy";

export type ScreeningStatus = "draft" | "open" | "closed";

type ScreeningDocument = {
  startsAt: Timestamp;
  localDate: string;
  localTime: string;
  title: string | null;
  message: string | null;
  status: ScreeningStatus;
  createdByMemberId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  openedAt: Timestamp | null;
  closedAt?: Timestamp | null;
};

type ReservationKind = "self" | "guest";

type PlaceDocument = {
  memberId: string;
  reservationId: string;
  kind: ReservationKind;
  bookedByMemberId?: string;
  displayName?: string;
  createdAt: Timestamp;
};

type ReservationDocument = {
  memberId: string;
  placeCode: PlaceCode;
  kind: ReservationKind;
  bookedByMemberId: string;
  displayName?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

type PlusOneDocument = {
  memberId: string | null;
  reservationId?: string;
  memberName?: string;
  placeCode: PlaceCode | null;
  waitlistEntryId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type WaitlistStateDocument = WaitlistState & {
  updatedAt: Timestamp;
};

type WaitlistDocument = {
  reservationId: string;
  memberId: string | null;
  displayName: string;
  kind: ReservationKind;
  bookedByMemberId: string;
  order: number;
  createdAt: Timestamp;
};

type BlockDocument = {
  placeCode: PlaceCode;
  blockedByMemberId: string;
  createdAt: Timestamp;
};

export type Screening = {
  id: string;
  startsAt: Date;
  localDate: string;
  localTime: string;
  title: string | null;
  message: string | null;
  status: ScreeningStatus;
  createdAt: Date;
};

export type ScreeningOccupancy = {
  placeCode: PlaceCode;
  memberId: string;
  memberName: string;
  isMine: boolean;
  isMyGuest: boolean;
  kind: ReservationKind;
  bookedByMemberId: string;
  bookedByName: string;
};

export type GuestReservation = {
  memberId: string | null;
  memberName: string;
  placeCode: PlaceCode;
};

export type WaitlistEntry = {
  reservationId: string;
  memberId: string | null;
  displayName: string;
  kind: ReservationKind;
  isMine: boolean;
  isMyGuest: boolean;
  position: number;
  bookedByMemberId: string;
  bookedByName: string;
};

export type OpenScreening = Screening & {
  occupancy: ScreeningOccupancy[];
  ownPlaceCode: PlaceCode | null;
  ownReservationKind: ReservationKind | null;
  guestReservation: GuestReservation | null;
  waitlist: WaitlistEntry[];
  ownWaitlistEntry: WaitlistEntry | null;
  guestWaitlistEntry: WaitlistEntry | null;
  blockedPlaceCodes: PlaceCode[];
};

export class ScreeningRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreeningRuleError";
  }
}

function screeningFromDocument(id: string, document: ScreeningDocument): Screening {
  return {
    id,
    startsAt: document.startsAt.toDate(),
    localDate: document.localDate,
    localTime: document.localTime,
    title: document.title,
    message: document.message,
    status: document.status,
    createdAt: document.createdAt.toDate(),
  };
}

function validDocumentId(value: string) {
  return value.length > 0 && value.length <= 100 && !value.includes("/");
}

function plusOneReservationId(plusOne: PlusOneDocument) {
  if (typeof plusOne.reservationId === "string" && validDocumentId(plusOne.reservationId)) {
    return plusOne.reservationId;
  }
  if (typeof plusOne.memberId === "string" && validDocumentId(plusOne.memberId)) {
    return plusOne.memberId;
  }
  return null;
}

function externalGuestReservationId(memberId: string) {
  const digest = createHash("sha256").update(memberId).digest("hex");
  return `external-${digest}`;
}

async function applyPromotionsAfterCancellation({
  transaction,
  screeningReference,
  removedReservationIds,
  removedWaitlistIds = [],
  releasedPlaceCodes = [],
}: {
  transaction: Transaction;
  screeningReference: FirebaseFirestore.DocumentReference;
  removedReservationIds: string[];
  removedWaitlistIds?: string[];
  releasedPlaceCodes?: PlaceCode[];
}) {
  const stateReference = screeningReference.collection("state").doc("waitlist");
  const waitlistQuery = screeningReference
    .collection("waitlist")
    .orderBy("order", "asc")
    .limit(5);
  const placeReferences = ALL_PLACE_CODES.map((code) =>
    screeningReference.collection("places").doc(code),
  );
  const [stateSnapshot, waitlistSnapshot] = await Promise.all([
    transaction.get(stateReference),
    transaction.get(waitlistQuery),
  ]);
  const placeSnapshots = await Promise.all(
    placeReferences.map((reference) => transaction.get(reference)),
  );

  const places = placeSnapshots.flatMap((snapshot): PromotionOccupant[] => {
    if (!snapshot.exists || !isPlaceCode(snapshot.id)) return [];
    const place = snapshot.data() as PlaceDocument;
    const bookedByMemberId =
      typeof place.bookedByMemberId === "string"
        ? place.bookedByMemberId
        : place.kind === "self"
          ? place.memberId
          : null;
    if (
      !validDocumentId(place.reservationId) ||
      !validDocumentId(place.memberId) ||
      !["self", "guest"].includes(place.kind) ||
      !bookedByMemberId
    ) {
      throw new ScreeningRuleError("No pudimos verificar la ocupación de la sala.");
    }
    return [{
      placeCode: snapshot.id,
      reservationId: place.reservationId,
      memberId: place.memberId,
      displayName:
        typeof place.displayName === "string" && place.displayName.trim()
          ? place.displayName
          : null,
      kind: place.kind,
      bookedByMemberId,
      enteredPlaceAt:
        place.createdAt instanceof Timestamp ? place.createdAt.toMillis() : 0,
    }];
  });
  const waitlist = waitlistSnapshot.docs.flatMap((snapshot): PromotionWaitEntry[] => {
    const entry = snapshot.data() as WaitlistDocument;
    if (
      !validDocumentId(entry.reservationId) ||
      typeof entry.displayName !== "string" ||
      !entry.displayName.trim() ||
      !["self", "guest"].includes(entry.kind) ||
      typeof entry.bookedByMemberId !== "string" ||
      !Number.isFinite(entry.order)
    ) {
      throw new ScreeningRuleError("No pudimos verificar la lista de espera.");
    }
    return [{
      reservationId: entry.reservationId,
      memberId: entry.memberId,
      displayName: entry.displayName,
      kind: entry.kind,
      bookedByMemberId: entry.bookedByMemberId,
      order: entry.order,
    }];
  });
  const now = Timestamp.now();
  const plan = planPromotions({
    places,
    waitlist,
    removedReservationIds,
    removedWaitlistIds,
    releasedPlaceCodes,
    operationTime: now.toMillis(),
  });

  const movedReservationReferences = plan.moves.map((move) =>
    screeningReference.collection("reservations").doc(move.occupant.reservationId),
  );
  const promotedReservationReferences = plan.promotions.map((promotion) =>
    screeningReference.collection("reservations").doc(promotion.entry.reservationId),
  );
  const guestPointerReferences = [
    ...plan.moves
      .filter((move) => move.occupant.kind === "guest")
      .map((move) => screeningReference.collection("plusOnes").doc(move.occupant.bookedByMemberId)),
    ...plan.promotions
      .filter((promotion) => promotion.entry.kind === "guest")
      .map((promotion) =>
        screeningReference.collection("plusOnes").doc(promotion.entry.bookedByMemberId),
      ),
  ];
  const [movedReservationSnapshots, promotedReservationSnapshots, guestPointerSnapshots] =
    await Promise.all([
      Promise.all(movedReservationReferences.map((reference) => transaction.get(reference))),
      Promise.all(promotedReservationReferences.map((reference) => transaction.get(reference))),
      Promise.all(guestPointerReferences.map((reference) => transaction.get(reference))),
    ]);
  if (movedReservationSnapshots.some((snapshot) => !snapshot.exists)) {
    throw new ScreeningRuleError("No pudimos verificar una reserva del piso.");
  }
  if (promotedReservationSnapshots.some((snapshot) => snapshot.exists)) {
    throw new ScreeningRuleError("Una persona en espera ya tiene una reserva.");
  }
  if (guestPointerSnapshots.some((snapshot) => !snapshot.exists)) {
    throw new ScreeningRuleError("No pudimos verificar la reserva de un +1.");
  }

  const finalPlaces = new Map(plan.finalPlaces.map((place) => [place.placeCode, place]));
  for (const code of plan.affectedPlaceCodes) {
    const reference = screeningReference.collection("places").doc(code);
    const occupant = finalPlaces.get(code);
    if (!occupant) {
      transaction.delete(reference);
      continue;
    }
    transaction.set(reference, {
      memberId: occupant.memberId,
      reservationId: occupant.reservationId,
      kind: occupant.kind,
      bookedByMemberId: occupant.bookedByMemberId,
      ...(occupant.displayName ? { displayName: occupant.displayName } : {}),
      createdAt: now,
    } satisfies PlaceDocument);
  }

  for (const move of plan.moves) {
    const reservationReference = screeningReference
      .collection("reservations")
      .doc(move.occupant.reservationId);
    transaction.update(reservationReference, { placeCode: move.to, updatedAt: now });
    if (move.occupant.kind === "guest") {
      transaction.update(
        screeningReference.collection("plusOnes").doc(move.occupant.bookedByMemberId),
        { placeCode: move.to, updatedAt: now },
      );
    }
  }

  for (const promotion of plan.promotions) {
    const entry = promotion.entry;
    transaction.create(
      screeningReference.collection("reservations").doc(entry.reservationId),
      {
        memberId: entry.reservationId,
        placeCode: promotion.to,
        kind: entry.kind,
        bookedByMemberId: entry.bookedByMemberId,
        displayName: entry.displayName,
        createdAt: now,
        updatedAt: now,
      } satisfies ReservationDocument,
    );
    transaction.delete(screeningReference.collection("waitlist").doc(entry.reservationId));
    if (entry.kind === "guest") {
      transaction.update(
        screeningReference.collection("plusOnes").doc(entry.bookedByMemberId),
        {
          placeCode: promotion.to,
          waitlistEntryId: FieldValue.delete(),
          updatedAt: now,
        },
      );
    }
  }

  for (const reservationId of removedWaitlistIds) {
    transaction.delete(screeningReference.collection("waitlist").doc(reservationId));
  }
  const previousState = stateSnapshot.exists
    ? (stateSnapshot.data() as WaitlistStateDocument)
    : null;
  const nextOrder =
    previousState && Number.isInteger(previousState.nextOrder)
      ? previousState.nextOrder
      : Math.max(0, ...waitlist.map((entry) => entry.order));
  transaction.set(stateReference, {
    count: plan.remainingWaitlist.length,
    nextOrder,
    updatedAt: now,
  } satisfies WaitlistStateDocument);

  return plan;
}

export async function createScreening(createdByMemberId: string, input: ScreeningInput) {
  const firestore = getAdminFirestore();
  const reference = firestore.collection("screenings").doc();
  const now = Timestamp.now();
  const document: ScreeningDocument = {
    startsAt: Timestamp.fromDate(input.startsAt),
    localDate: input.localDate,
    localTime: input.localTime,
    title: input.title,
    message: input.message,
    status: "draft",
    createdByMemberId,
    createdAt: now,
    updatedAt: now,
    openedAt: null,
    closedAt: null,
  };
  await reference.create(document);
  return screeningFromDocument(reference.id, document);
}

export async function listScreenings(): Promise<Screening[]> {
  const snapshot = await getAdminFirestore()
    .collection("screenings")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snapshot.docs.map((document) =>
    screeningFromDocument(document.id, document.data() as ScreeningDocument),
  );
}

export async function openScreening(screeningId: string) {
  if (!validDocumentId(screeningId)) {
    throw new ScreeningRuleError("La función no es válida.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");

  return firestore.runTransaction(async (transaction) => {
    const [screeningSnapshot, pointerSnapshot] = await Promise.all([
      transaction.get(screeningReference),
      transaction.get(pointerReference),
    ]);
    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }

    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    let currentStatus: ScreeningStatus | null = null;
    if (typeof currentId === "string" && currentId !== screeningId) {
      const currentSnapshot = await transaction.get(
        firestore.collection("screenings").doc(currentId),
      );
      currentStatus = currentSnapshot.exists
        ? (currentSnapshot.data() as ScreeningDocument).status
        : null;
    }
    let decision: ReturnType<typeof planScreeningOpening>;
    try {
      decision = planScreeningOpening({
        screeningId,
        status: screening.status,
        currentScreeningId: currentId,
        currentScreeningStatus: currentStatus,
      });
    } catch (error) {
      throw new ScreeningRuleError(
        error instanceof ScreeningLifecycleError
          ? error.message
          : "No pudimos verificar si se puede abrir la función.",
      );
    }
    if (decision === "already-open") return false;

    const now = Timestamp.now();
    transaction.update(screeningReference, {
      status: "open",
      openedAt: screening.openedAt ?? now,
      updatedAt: now,
    });
    transaction.set(pointerReference, { screeningId, updatedAt: now });
    return true;
  });
}

export async function closeScreening(screeningId: string) {
  if (!validDocumentId(screeningId)) {
    throw new ScreeningRuleError("La función no es válida.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");

  return firestore.runTransaction(async (transaction) => {
    const [screeningSnapshot, pointerSnapshot] = await Promise.all([
      transaction.get(screeningReference),
      transaction.get(pointerReference),
    ]);
    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }

    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    let decision: ReturnType<typeof planScreeningClosure>;
    try {
      decision = planScreeningClosure({
        screeningId,
        status: screening.status,
        currentScreeningId: currentId,
      });
    } catch (error) {
      throw new ScreeningRuleError(
        error instanceof ScreeningLifecycleError
          ? error.message
          : "No pudimos verificar la función abierta.",
      );
    }
    if (decision === "already-closed") return false;

    const now = Timestamp.now();
    transaction.update(screeningReference, {
      status: "closed",
      closedAt: now,
      updatedAt: now,
    });
    transaction.set(pointerReference, {
      screeningId,
      status: "closed",
      updatedAt: now,
    });
    return true;
  });
}

export async function reserveOwnSeat(
  screeningId: string,
  member: Pick<Member, "id">,
  placeCode: unknown,
) {
  if (!validDocumentId(screeningId) || !isPlaceCode(placeCode)) {
    throw new ScreeningRuleError("Elegí un asiento válido.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const reservationReference = screeningReference.collection("reservations").doc(member.id);
  const waitlistReference = screeningReference.collection("waitlist").doc(member.id);
  const placeReference = screeningReference.collection("places").doc(placeCode);
  const blockReference = screeningReference.collection("blocks").doc(placeCode);

  return firestore.runTransaction(async (transaction) => {
    const [
      screeningSnapshot,
      pointerSnapshot,
      reservationSnapshot,
      waitlistSnapshot,
      placeSnapshot,
      blockSnapshot,
    ] =
      await Promise.all([
        transaction.get(screeningReference),
        transaction.get(pointerReference),
        transaction.get(reservationReference),
        transaction.get(waitlistReference),
        transaction.get(placeReference),
        transaction.get(blockReference),
      ]);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    if (reservationSnapshot.exists) {
      throw new ScreeningRuleError("Ya tenés un lugar en esta función.");
    }
    if (waitlistSnapshot.exists) {
      throw new ScreeningRuleError("Ya estás en la lista de espera.");
    }
    if (placeSnapshot.exists) {
      throw new ScreeningRuleError("Ese asiento acaba de ser ocupado. Elegí otro.");
    }
    if (blockSnapshot.exists) {
      throw new ScreeningRuleError("Ese lugar está bloqueado por un administrador.");
    }

    const now = Timestamp.now();
    transaction.create(reservationReference, {
      memberId: member.id,
      placeCode,
      kind: "self",
      bookedByMemberId: member.id,
      createdAt: now,
      updatedAt: now,
    } satisfies ReservationDocument);
    transaction.create(placeReference, {
      memberId: member.id,
      reservationId: member.id,
      kind: "self",
      bookedByMemberId: member.id,
      createdAt: now,
    } satisfies PlaceDocument);
    return placeCode;
  });
}

export async function changeOwnSeat(
  screeningId: string,
  member: Pick<Member, "id">,
  nextPlaceCode: unknown,
) {
  if (!validDocumentId(screeningId) || !isPlaceCode(nextPlaceCode)) {
    throw new ScreeningRuleError("Elegí un asiento válido.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const reservationReference = screeningReference.collection("reservations").doc(member.id);

  return firestore.runTransaction(async (transaction) => {
    const [screeningSnapshot, pointerSnapshot, reservationSnapshot] = await Promise.all([
      transaction.get(screeningReference),
      transaction.get(pointerReference),
      transaction.get(reservationReference),
    ]);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    if (!reservationSnapshot.exists) {
      throw new ScreeningRuleError("Todavía no tenés un lugar para cambiar.");
    }

    const reservation = reservationSnapshot.data() as ReservationDocument;
    if (
      reservation.memberId !== member.id ||
      !isPlaceCode(reservation.placeCode) ||
      !["self", "guest"].includes(reservation.kind)
    ) {
      throw new ScreeningRuleError("No pudimos verificar tu reserva. Avisale a un administrador.");
    }
    if (reservation.placeCode === nextPlaceCode) {
      throw new ScreeningRuleError("Ese ya es tu asiento.");
    }

    const currentPlaceReference = screeningReference
      .collection("places")
      .doc(reservation.placeCode);
    const nextPlaceReference = screeningReference.collection("places").doc(nextPlaceCode);
    const nextBlockReference = screeningReference.collection("blocks").doc(nextPlaceCode);
    const [currentPlaceSnapshot, nextPlaceSnapshot, nextBlockSnapshot] = await Promise.all([
      transaction.get(currentPlaceReference),
      transaction.get(nextPlaceReference),
      transaction.get(nextBlockReference),
    ]);
    const plusOneReference =
      reservation.kind === "guest"
        ? screeningReference.collection("plusOnes").doc(reservation.bookedByMemberId)
        : null;
    const plusOneSnapshot = plusOneReference
      ? await transaction.get(plusOneReference)
      : null;
    const currentPlace = currentPlaceSnapshot.exists
      ? (currentPlaceSnapshot.data() as PlaceDocument)
      : null;
    if (!currentPlace || currentPlace.memberId !== member.id) {
      throw new ScreeningRuleError("No pudimos verificar tu asiento actual. Avisale a un administrador.");
    }
    if (
      plusOneSnapshot &&
      (!plusOneSnapshot.exists ||
        plusOneReservationId(plusOneSnapshot.data() as PlusOneDocument) !== member.id)
    ) {
      throw new ScreeningRuleError("No pudimos verificar quién reservó tu lugar.");
    }
    if (nextPlaceSnapshot.exists) {
      throw new ScreeningRuleError("Ese asiento acaba de ser ocupado. Elegí otro.");
    }
    if (nextBlockSnapshot.exists) {
      throw new ScreeningRuleError("Ese lugar está bloqueado por un administrador.");
    }

    const now = Timestamp.now();
    transaction.delete(currentPlaceReference);
    transaction.create(nextPlaceReference, {
      memberId: member.id,
      reservationId: member.id,
      kind: reservation.kind,
      bookedByMemberId: reservation.bookedByMemberId,
      ...(reservation.displayName ? { displayName: reservation.displayName } : {}),
      createdAt: now,
    } satisfies PlaceDocument);
    transaction.update(reservationReference, {
      placeCode: nextPlaceCode,
      updatedAt: now,
    });
    if (plusOneReference) {
      transaction.update(plusOneReference, { placeCode: nextPlaceCode, updatedAt: now });
    }
    return nextPlaceCode;
  });
}

export async function cancelOwnReservation(
  screeningId: string,
  member: Pick<Member, "id">,
) {
  if (!validDocumentId(screeningId)) {
    throw new ScreeningRuleError("La función no es válida.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const reservationReference = screeningReference.collection("reservations").doc(member.id);

  return firestore.runTransaction(async (transaction) => {
    const [screeningSnapshot, pointerSnapshot, reservationSnapshot] = await Promise.all([
      transaction.get(screeningReference),
      transaction.get(pointerReference),
      transaction.get(reservationReference),
    ]);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    if (!reservationSnapshot.exists) {
      throw new ScreeningRuleError("No tenés una reserva para cancelar.");
    }

    const reservation = reservationSnapshot.data() as ReservationDocument;
    if (
      reservation.memberId !== member.id ||
      !isPlaceCode(reservation.placeCode) ||
      !["self", "guest"].includes(reservation.kind)
    ) {
      throw new ScreeningRuleError("No pudimos verificar tu reserva. Avisale a un administrador.");
    }
    const placeReference = screeningReference.collection("places").doc(reservation.placeCode);
    const plusOneReference = screeningReference
      .collection("plusOnes")
      .doc(reservation.kind === "self" ? member.id : reservation.bookedByMemberId);
    const [placeSnapshot, plusOneSnapshot] = await Promise.all([
      transaction.get(placeReference),
      transaction.get(plusOneReference),
    ]);
    const place = placeSnapshot.exists ? (placeSnapshot.data() as PlaceDocument) : null;
    if (!place || place.memberId !== member.id) {
      throw new ScreeningRuleError("No pudimos verificar tu asiento. Avisale a un administrador.");
    }

    let guestReservationReference: FirebaseFirestore.DocumentReference | null = null;
    let guestPlaceReference: FirebaseFirestore.DocumentReference | null = null;
    let guestWaitlistReference: FirebaseFirestore.DocumentReference | null = null;
    let guestReservationIdToCancel: string | null = null;

    if (reservation.kind === "guest") {
      if (
        !plusOneSnapshot.exists ||
        plusOneReservationId(plusOneSnapshot.data() as PlusOneDocument) !== member.id
      ) {
        throw new ScreeningRuleError("No pudimos verificar quién reservó tu lugar.");
      }
    } else if (plusOneSnapshot.exists) {
      const plusOne = plusOneSnapshot.data() as PlusOneDocument;
      const guestReservationId = plusOneReservationId(plusOne);
      if (!guestReservationId) {
        throw new ScreeningRuleError("No pudimos verificar la reserva de tu +1.");
      }
      guestReservationIdToCancel = guestReservationId;
      if (isPlaceCode(plusOne.placeCode)) {
        guestReservationReference = screeningReference
          .collection("reservations")
          .doc(guestReservationId);
        guestPlaceReference = screeningReference.collection("places").doc(plusOne.placeCode);
        const [guestReservationSnapshot, guestPlaceSnapshot] = await Promise.all([
          transaction.get(guestReservationReference),
          transaction.get(guestPlaceReference),
        ]);
        const guestReservation = guestReservationSnapshot.exists
          ? (guestReservationSnapshot.data() as ReservationDocument)
          : null;
        const guestPlace = guestPlaceSnapshot.exists
          ? (guestPlaceSnapshot.data() as PlaceDocument)
          : null;
        if (
          !guestReservation ||
          guestReservation.kind !== "guest" ||
          guestReservation.bookedByMemberId !== member.id ||
          !guestPlace ||
          guestPlace.memberId !== guestReservationId
        ) {
          throw new ScreeningRuleError("No pudimos verificar la reserva de tu +1.");
        }
      } else {
        guestWaitlistReference = screeningReference
          .collection("waitlist")
          .doc(guestReservationId);
        const guestWaitlistSnapshot = await transaction.get(guestWaitlistReference);
        const guestEntry = guestWaitlistSnapshot.exists
          ? (guestWaitlistSnapshot.data() as WaitlistDocument)
          : null;
        if (!guestEntry || guestEntry.bookedByMemberId !== member.id) {
          throw new ScreeningRuleError("No pudimos verificar la espera de tu +1.");
        }
      }
    }

    const removedReservationIds = [member.id];
    if (guestReservationReference && guestReservationIdToCancel) {
      removedReservationIds.push(guestReservationIdToCancel);
    }
    await applyPromotionsAfterCancellation({
      transaction,
      screeningReference,
      removedReservationIds,
      removedWaitlistIds:
        guestWaitlistReference && guestReservationIdToCancel
          ? [guestReservationIdToCancel]
          : [],
    });

    transaction.delete(reservationReference);
    if (reservation.kind === "guest" || plusOneSnapshot.exists) {
      transaction.delete(plusOneReference);
    }
    if (guestReservationReference && guestPlaceReference) {
      transaction.delete(guestReservationReference);
    }
    return reservation.placeCode;
  });
}

export async function reserveGuestSeat(
  screeningId: string,
  member: Pick<Member, "id">,
  guestMemberId: unknown,
  guestName: unknown,
  placeCode: unknown,
) {
  let enteredName: string;
  try {
    enteredName = parseGuestName(guestName);
  } catch (error) {
    throw new ScreeningRuleError(
      error instanceof GuestNameError ? error.message : "El nombre de tu +1 no es válido.",
    );
  }
  const registeredGuestMemberId =
    typeof guestMemberId === "string" && guestMemberId
      ? guestMemberId
      : null;
  if (
    !validDocumentId(screeningId) ||
    (registeredGuestMemberId !== null && !validDocumentId(registeredGuestMemberId)) ||
    registeredGuestMemberId === member.id ||
    !isPlaceCode(placeCode)
  ) {
    throw new ScreeningRuleError("Elegí un miembro y un asiento válidos.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const ownerReservationReference = screeningReference
    .collection("reservations")
    .doc(member.id);
  const ownerWaitlistReference = screeningReference.collection("waitlist").doc(member.id);
  const plusOneReference = screeningReference.collection("plusOnes").doc(member.id);
  const guestMemberReference = registeredGuestMemberId
    ? firestore.collection("members").doc(registeredGuestMemberId)
    : null;
  const guestReservationId =
    registeredGuestMemberId ?? externalGuestReservationId(member.id);
  const guestReservationReference = screeningReference
    .collection("reservations")
    .doc(guestReservationId);
  const guestWaitlistReference = screeningReference
    .collection("waitlist")
    .doc(guestReservationId);
  const placeReference = screeningReference.collection("places").doc(placeCode);
  const blockReference = screeningReference.collection("blocks").doc(placeCode);

  return firestore.runTransaction(async (transaction) => {
    const [
      screeningSnapshot,
      pointerSnapshot,
      ownerReservationSnapshot,
      ownerWaitlistSnapshot,
      plusOneSnapshot,
      guestMemberSnapshot,
      guestReservationSnapshot,
      guestWaitlistSnapshot,
      placeSnapshot,
      blockSnapshot,
    ] = await Promise.all([
      transaction.get(screeningReference),
      transaction.get(pointerReference),
      transaction.get(ownerReservationReference),
      transaction.get(ownerWaitlistReference),
      transaction.get(plusOneReference),
      guestMemberReference ? transaction.get(guestMemberReference) : Promise.resolve(null),
      transaction.get(guestReservationReference),
      transaction.get(guestWaitlistReference),
      transaction.get(placeReference),
      transaction.get(blockReference),
    ]);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    const ownerReservation = ownerReservationSnapshot.exists
      ? (ownerReservationSnapshot.data() as ReservationDocument)
      : null;
    const ownerWaitlist = ownerWaitlistSnapshot.exists
      ? (ownerWaitlistSnapshot.data() as WaitlistDocument)
      : null;
    if (
      (!ownerReservation || ownerReservation.kind !== "self") &&
      (!ownerWaitlist || ownerWaitlist.kind !== "self")
    ) {
      throw new ScreeningRuleError("Primero tenés que reservar tu lugar o entrar en espera.");
    }
    if (plusOneSnapshot.exists) {
      throw new ScreeningRuleError("Ya reservaste un lugar para tu +1.");
    }
    let displayName = enteredName;
    if (registeredGuestMemberId) {
      if (
        !guestMemberSnapshot?.exists ||
        (guestMemberSnapshot.data() as { active?: unknown }).active !== true
      ) {
        throw new ScreeningRuleError("Ese miembro no está disponible.");
      }
      const registeredName = (guestMemberSnapshot.data() as { name?: unknown }).name;
      if (typeof registeredName === "string" && registeredName.trim()) {
        displayName = registeredName.trim();
      }
    }
    if (guestReservationSnapshot.exists) {
      throw new ScreeningRuleError("Esa persona ya tiene un lugar en la función.");
    }
    if (guestWaitlistSnapshot.exists) {
      throw new ScreeningRuleError("Esa persona ya está en la lista de espera.");
    }
    if (placeSnapshot.exists) {
      throw new ScreeningRuleError("Ese asiento acaba de ser ocupado. Elegí otro.");
    }
    if (blockSnapshot.exists) {
      throw new ScreeningRuleError("Ese lugar está bloqueado por un administrador.");
    }

    const now = Timestamp.now();
    transaction.create(guestReservationReference, {
      memberId: guestReservationId,
      placeCode,
      kind: "guest",
      bookedByMemberId: member.id,
      displayName,
      createdAt: now,
      updatedAt: now,
    } satisfies ReservationDocument);
    transaction.create(placeReference, {
      memberId: guestReservationId,
      reservationId: guestReservationId,
      kind: "guest",
      bookedByMemberId: member.id,
      displayName,
      createdAt: now,
    } satisfies PlaceDocument);
    transaction.create(plusOneReference, {
      memberId: registeredGuestMemberId,
      reservationId: guestReservationId,
      memberName: displayName,
      placeCode,
      createdAt: now,
      updatedAt: now,
    } satisfies PlusOneDocument);
    return placeCode;
  });
}

export async function changeGuestSeat(
  screeningId: string,
  member: Pick<Member, "id">,
  nextPlaceCode: unknown,
) {
  if (!validDocumentId(screeningId) || !isPlaceCode(nextPlaceCode)) {
    throw new ScreeningRuleError("Elegí un asiento válido.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const ownerReservationReference = screeningReference
    .collection("reservations")
    .doc(member.id);
  const ownerWaitlistReference = screeningReference.collection("waitlist").doc(member.id);
  const plusOneReference = screeningReference.collection("plusOnes").doc(member.id);

  return firestore.runTransaction(async (transaction) => {
    const [
      screeningSnapshot,
      pointerSnapshot,
      ownerReservationSnapshot,
      ownerWaitlistSnapshot,
      plusOneSnapshot,
    ] =
      await Promise.all([
        transaction.get(screeningReference),
        transaction.get(pointerReference),
        transaction.get(ownerReservationReference),
        transaction.get(ownerWaitlistReference),
        transaction.get(plusOneReference),
      ]);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    const ownerReservation = ownerReservationSnapshot.exists
      ? (ownerReservationSnapshot.data() as ReservationDocument)
      : null;
    const ownerWaitlist = ownerWaitlistSnapshot.exists
      ? (ownerWaitlistSnapshot.data() as WaitlistDocument)
      : null;
    if (
      (!ownerReservation || ownerReservation.kind !== "self") &&
      (!ownerWaitlist || ownerWaitlist.kind !== "self")
    ) {
      throw new ScreeningRuleError("No tenés una reserva personal activa.");
    }
    if (!plusOneSnapshot.exists) {
      throw new ScreeningRuleError("Todavía no reservaste un lugar para tu +1.");
    }

    const plusOne = plusOneSnapshot.data() as PlusOneDocument;
    const guestReservationId = plusOneReservationId(plusOne);
    if (!guestReservationId || !isPlaceCode(plusOne.placeCode)) {
      throw new ScreeningRuleError("No pudimos verificar la reserva de tu +1.");
    }
    if (plusOne.placeCode === nextPlaceCode) {
      throw new ScreeningRuleError("Ese ya es el asiento de tu +1.");
    }

    const guestReservationReference = screeningReference
      .collection("reservations")
      .doc(guestReservationId);
    const currentPlaceReference = screeningReference.collection("places").doc(plusOne.placeCode);
    const nextPlaceReference = screeningReference.collection("places").doc(nextPlaceCode);
    const nextBlockReference = screeningReference.collection("blocks").doc(nextPlaceCode);
    const [guestReservationSnapshot, currentPlaceSnapshot, nextPlaceSnapshot, nextBlockSnapshot] =
      await Promise.all([
        transaction.get(guestReservationReference),
        transaction.get(currentPlaceReference),
        transaction.get(nextPlaceReference),
        transaction.get(nextBlockReference),
      ]);
    const guestReservation = guestReservationSnapshot.exists
      ? (guestReservationSnapshot.data() as ReservationDocument)
      : null;
    const currentPlace = currentPlaceSnapshot.exists
      ? (currentPlaceSnapshot.data() as PlaceDocument)
      : null;
    if (
      !guestReservation ||
      guestReservation.kind !== "guest" ||
      guestReservation.bookedByMemberId !== member.id ||
      !currentPlace ||
      currentPlace.memberId !== guestReservationId
    ) {
      throw new ScreeningRuleError("No pudimos verificar la reserva de tu +1.");
    }
    if (nextPlaceSnapshot.exists) {
      throw new ScreeningRuleError("Ese asiento acaba de ser ocupado. Elegí otro.");
    }
    if (nextBlockSnapshot.exists) {
      throw new ScreeningRuleError("Ese lugar está bloqueado por un administrador.");
    }

    const now = Timestamp.now();
    transaction.delete(currentPlaceReference);
    transaction.create(nextPlaceReference, {
      memberId: guestReservationId,
      reservationId: guestReservationId,
      kind: "guest",
      bookedByMemberId: member.id,
      displayName: plusOne.memberName ?? guestReservation.displayName,
      createdAt: now,
    } satisfies PlaceDocument);
    transaction.update(guestReservationReference, { placeCode: nextPlaceCode, updatedAt: now });
    transaction.update(plusOneReference, { placeCode: nextPlaceCode, updatedAt: now });
    return nextPlaceCode;
  });
}

export async function cancelGuestReservation(
  screeningId: string,
  member: Pick<Member, "id">,
) {
  if (!validDocumentId(screeningId)) {
    throw new ScreeningRuleError("La función no es válida.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const ownerReservationReference = screeningReference
    .collection("reservations")
    .doc(member.id);
  const ownerWaitlistReference = screeningReference.collection("waitlist").doc(member.id);
  const plusOneReference = screeningReference.collection("plusOnes").doc(member.id);

  return firestore.runTransaction(async (transaction) => {
    const [
      screeningSnapshot,
      pointerSnapshot,
      ownerReservationSnapshot,
      ownerWaitlistSnapshot,
      plusOneSnapshot,
    ] =
      await Promise.all([
        transaction.get(screeningReference),
        transaction.get(pointerReference),
        transaction.get(ownerReservationReference),
        transaction.get(ownerWaitlistReference),
        transaction.get(plusOneReference),
      ]);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    const ownerReservation = ownerReservationSnapshot.exists
      ? (ownerReservationSnapshot.data() as ReservationDocument)
      : null;
    const ownerWaitlist = ownerWaitlistSnapshot.exists
      ? (ownerWaitlistSnapshot.data() as WaitlistDocument)
      : null;
    if (
      ((!ownerReservation || ownerReservation.kind !== "self") &&
        (!ownerWaitlist || ownerWaitlist.kind !== "self")) ||
      !plusOneSnapshot.exists
    ) {
      throw new ScreeningRuleError("No tenés una reserva de +1 para cancelar.");
    }

    const plusOne = plusOneSnapshot.data() as PlusOneDocument;
    const guestReservationId = plusOneReservationId(plusOne);
    if (!guestReservationId || !isPlaceCode(plusOne.placeCode)) {
      throw new ScreeningRuleError("No pudimos verificar la reserva de tu +1.");
    }
    const guestReservationReference = screeningReference
      .collection("reservations")
      .doc(guestReservationId);
    const guestPlaceReference = screeningReference.collection("places").doc(plusOne.placeCode);
    const [guestReservationSnapshot, guestPlaceSnapshot] = await Promise.all([
      transaction.get(guestReservationReference),
      transaction.get(guestPlaceReference),
    ]);
    const guestReservation = guestReservationSnapshot.exists
      ? (guestReservationSnapshot.data() as ReservationDocument)
      : null;
    const guestPlace = guestPlaceSnapshot.exists
      ? (guestPlaceSnapshot.data() as PlaceDocument)
      : null;
    if (
      !guestReservation ||
      guestReservation.kind !== "guest" ||
      guestReservation.bookedByMemberId !== member.id ||
      !guestPlace ||
      guestPlace.memberId !== guestReservationId
    ) {
      throw new ScreeningRuleError("No pudimos verificar la reserva de tu +1.");
    }

    await applyPromotionsAfterCancellation({
      transaction,
      screeningReference,
      removedReservationIds: [guestReservationId],
    });
    transaction.delete(guestReservationReference);
    transaction.delete(plusOneReference);
    return plusOne.placeCode;
  });
}

export async function cancelGuestWaitlist(
  screeningId: string,
  member: Pick<Member, "id">,
) {
  if (!validDocumentId(screeningId)) {
    throw new ScreeningRuleError("La función no es válida.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const plusOneReference = screeningReference.collection("plusOnes").doc(member.id);
  const stateReference = screeningReference.collection("state").doc("waitlist");

  return firestore.runTransaction(async (transaction) => {
    const [screeningSnapshot, pointerSnapshot, plusOneSnapshot, stateSnapshot] =
      await Promise.all([
        transaction.get(screeningReference),
        transaction.get(pointerReference),
        transaction.get(plusOneReference),
        transaction.get(stateReference),
      ]);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    if (!plusOneSnapshot.exists) {
      throw new ScreeningRuleError("Tu +1 no está en la lista de espera.");
    }

    const plusOne = plusOneSnapshot.data() as PlusOneDocument;
    const guestReservationId = plusOneReservationId(plusOne);
    if (!guestReservationId || plusOne.placeCode !== null) {
      throw new ScreeningRuleError("Tu +1 no está en la lista de espera.");
    }
    const waitlistReference = screeningReference
      .collection("waitlist")
      .doc(guestReservationId);
    const waitlistSnapshot = await transaction.get(waitlistReference);
    const entry = waitlistSnapshot.exists
      ? (waitlistSnapshot.data() as WaitlistDocument)
      : null;
    if (!entry || entry.kind !== "guest" || entry.bookedByMemberId !== member.id) {
      throw new ScreeningRuleError("No pudimos verificar la espera de tu +1.");
    }

    const now = Timestamp.now();
    const nextState = releaseWaitlistSlots(
      stateSnapshot.exists ? (stateSnapshot.data() as WaitlistStateDocument) : null,
    );
    transaction.delete(waitlistReference);
    transaction.delete(plusOneReference);
    transaction.set(stateReference, { ...nextState, updatedAt: now } satisfies WaitlistStateDocument);
    return entry.order;
  });
}

export async function cancelOwnWaitlist(
  screeningId: string,
  member: Pick<Member, "id">,
) {
  if (!validDocumentId(screeningId)) {
    throw new ScreeningRuleError("La función no es válida.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const waitlistReference = screeningReference.collection("waitlist").doc(member.id);

  return firestore.runTransaction(async (transaction) => {
    const [screeningSnapshot, pointerSnapshot, waitlistSnapshot] =
      await Promise.all([
        transaction.get(screeningReference),
        transaction.get(pointerReference),
        transaction.get(waitlistReference),
      ]);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    if (!waitlistSnapshot.exists) {
      throw new ScreeningRuleError("No estás en la lista de espera.");
    }

    const entry = waitlistSnapshot.data() as WaitlistDocument;
    if (entry.reservationId !== member.id || !["self", "guest"].includes(entry.kind)) {
      throw new ScreeningRuleError("No pudimos verificar tu lugar en espera.");
    }
    const plusOneReference = screeningReference
      .collection("plusOnes")
      .doc(entry.kind === "self" ? member.id : entry.bookedByMemberId);
    const plusOneSnapshot = await transaction.get(plusOneReference);

    let guestReservationReference: FirebaseFirestore.DocumentReference | null = null;
    let guestPlaceReference: FirebaseFirestore.DocumentReference | null = null;
    let guestWaitlistReference: FirebaseFirestore.DocumentReference | null = null;
    let guestReservationIdToCancel: string | null = null;

    if (entry.kind === "guest") {
      if (!plusOneSnapshot.exists) {
        throw new ScreeningRuleError("No pudimos verificar quién te agregó a la espera.");
      }
      const plusOne = plusOneSnapshot.data() as PlusOneDocument;
      if (plusOneReservationId(plusOne) !== member.id || plusOne.placeCode !== null) {
        throw new ScreeningRuleError("No pudimos verificar quién te agregó a la espera.");
      }
    } else if (plusOneSnapshot.exists) {
      const plusOne = plusOneSnapshot.data() as PlusOneDocument;
      const guestReservationId = plusOneReservationId(plusOne);
      if (!guestReservationId) {
        throw new ScreeningRuleError("No pudimos verificar la reserva de tu +1.");
      }
      guestReservationIdToCancel = guestReservationId;
      if (isPlaceCode(plusOne.placeCode)) {
        guestReservationReference = screeningReference
          .collection("reservations")
          .doc(guestReservationId);
        guestPlaceReference = screeningReference
          .collection("places")
          .doc(plusOne.placeCode);
        const [guestReservationSnapshot, guestPlaceSnapshot] = await Promise.all([
          transaction.get(guestReservationReference),
          transaction.get(guestPlaceReference),
        ]);
        const guestReservation = guestReservationSnapshot.exists
          ? (guestReservationSnapshot.data() as ReservationDocument)
          : null;
        const guestPlace = guestPlaceSnapshot.exists
          ? (guestPlaceSnapshot.data() as PlaceDocument)
          : null;
        if (
          !guestReservation ||
          guestReservation.bookedByMemberId !== member.id ||
          !guestPlace ||
          guestPlace.memberId !== guestReservationId
        ) {
          throw new ScreeningRuleError("No pudimos verificar la reserva de tu +1.");
        }
      } else {
        guestWaitlistReference = screeningReference
          .collection("waitlist")
          .doc(guestReservationId);
        const guestWaitlistSnapshot = await transaction.get(guestWaitlistReference);
        const guestEntry = guestWaitlistSnapshot.exists
          ? (guestWaitlistSnapshot.data() as WaitlistDocument)
          : null;
        if (!guestEntry || guestEntry.bookedByMemberId !== member.id) {
          throw new ScreeningRuleError("No pudimos verificar la espera de tu +1.");
        }
      }
    }

    await applyPromotionsAfterCancellation({
      transaction,
      screeningReference,
      removedReservationIds:
        guestReservationReference && guestReservationIdToCancel
          ? [guestReservationIdToCancel]
          : [],
      removedWaitlistIds: [
        member.id,
        ...(guestWaitlistReference && guestReservationIdToCancel
          ? [guestReservationIdToCancel]
          : []),
      ],
    });

    if (entry.kind === "guest" || plusOneSnapshot.exists) {
      transaction.delete(plusOneReference);
    }
    if (guestReservationReference && guestPlaceReference) {
      transaction.delete(guestReservationReference);
    }
    return entry.order;
  });
}

export async function joinOwnWaitlist(
  screeningId: string,
  member: Pick<Member, "id" | "name">,
) {
  if (!validDocumentId(screeningId)) {
    throw new ScreeningRuleError("La función no es válida.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const reservationReference = screeningReference.collection("reservations").doc(member.id);
  const waitlistReference = screeningReference.collection("waitlist").doc(member.id);
  const stateReference = screeningReference.collection("state").doc("waitlist");
  const placeReferences = ALL_PLACE_CODES.map((code) =>
    screeningReference.collection("places").doc(code),
  );
  const blockReferences = ALL_PLACE_CODES.map((code) =>
    screeningReference.collection("blocks").doc(code),
  );

  return firestore.runTransaction(async (transaction) => {
    const [
      screeningSnapshot,
      pointerSnapshot,
      reservationSnapshot,
      waitlistSnapshot,
      stateSnapshot,
      ...capacitySnapshots
    ] = await Promise.all([
      transaction.get(screeningReference),
      transaction.get(pointerReference),
      transaction.get(reservationReference),
      transaction.get(waitlistReference),
      transaction.get(stateReference),
      ...placeReferences.map((reference) => transaction.get(reference)),
      ...blockReferences.map((reference) => transaction.get(reference)),
    ]);
    const placeSnapshots = capacitySnapshots.slice(0, ALL_PLACE_CODES.length);
    const blockSnapshots = capacitySnapshots.slice(ALL_PLACE_CODES.length);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    if (
      ALL_PLACE_CODES.some(
        (_code, index) => !placeSnapshots[index]?.exists && !blockSnapshots[index]?.exists,
      )
    ) {
      throw new ScreeningRuleError("Todavía quedan lugares disponibles en la sala.");
    }
    if (reservationSnapshot.exists) {
      throw new ScreeningRuleError("Ya tenés un lugar en esta función.");
    }
    if (waitlistSnapshot.exists) {
      throw new ScreeningRuleError("Ya estás en la lista de espera.");
    }

    let slot: ReturnType<typeof claimWaitlistSlot>;
    try {
      slot = claimWaitlistSlot(
        stateSnapshot.exists ? (stateSnapshot.data() as WaitlistStateDocument) : null,
      );
    } catch (error) {
      throw new ScreeningRuleError(
        error instanceof WaitlistFullError ? error.message : "No pudimos validar la lista.",
      );
    }

    const now = Timestamp.now();
    transaction.create(waitlistReference, {
      reservationId: member.id,
      memberId: member.id,
      displayName: member.name,
      kind: "self",
      bookedByMemberId: member.id,
      order: slot.order,
      createdAt: now,
    } satisfies WaitlistDocument);
    transaction.set(stateReference, { ...slot.state, updatedAt: now } satisfies WaitlistStateDocument);
    return slot.order;
  });
}

export async function joinGuestWaitlist(
  screeningId: string,
  member: Pick<Member, "id">,
  guestMemberId: unknown,
  guestName: unknown,
) {
  let enteredName: string;
  try {
    enteredName = parseGuestName(guestName);
  } catch (error) {
    throw new ScreeningRuleError(
      error instanceof GuestNameError ? error.message : "El nombre de tu +1 no es válido.",
    );
  }
  const registeredGuestMemberId =
    typeof guestMemberId === "string" && guestMemberId ? guestMemberId : null;
  if (
    !validDocumentId(screeningId) ||
    (registeredGuestMemberId !== null && !validDocumentId(registeredGuestMemberId)) ||
    registeredGuestMemberId === member.id
  ) {
    throw new ScreeningRuleError("Elegí un invitado válido.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const ownerReservationReference = screeningReference
    .collection("reservations")
    .doc(member.id);
  const ownerWaitlistReference = screeningReference.collection("waitlist").doc(member.id);
  const plusOneReference = screeningReference.collection("plusOnes").doc(member.id);
  const guestMemberReference = registeredGuestMemberId
    ? firestore.collection("members").doc(registeredGuestMemberId)
    : null;
  const guestReservationId =
    registeredGuestMemberId ?? externalGuestReservationId(member.id);
  const guestReservationReference = screeningReference
    .collection("reservations")
    .doc(guestReservationId);
  const guestWaitlistReference = screeningReference
    .collection("waitlist")
    .doc(guestReservationId);
  const stateReference = screeningReference.collection("state").doc("waitlist");
  const placeReferences = ALL_PLACE_CODES.map((code) =>
    screeningReference.collection("places").doc(code),
  );
  const blockReferences = ALL_PLACE_CODES.map((code) =>
    screeningReference.collection("blocks").doc(code),
  );

  return firestore.runTransaction(async (transaction) => {
    const [
      screeningSnapshot,
      pointerSnapshot,
      ownerReservationSnapshot,
      ownerWaitlistSnapshot,
      plusOneSnapshot,
      guestMemberSnapshot,
      guestReservationSnapshot,
      guestWaitlistSnapshot,
      stateSnapshot,
      ...capacitySnapshots
    ] = await Promise.all([
      transaction.get(screeningReference),
      transaction.get(pointerReference),
      transaction.get(ownerReservationReference),
      transaction.get(ownerWaitlistReference),
      transaction.get(plusOneReference),
      guestMemberReference ? transaction.get(guestMemberReference) : Promise.resolve(null),
      transaction.get(guestReservationReference),
      transaction.get(guestWaitlistReference),
      transaction.get(stateReference),
      ...placeReferences.map((reference) => transaction.get(reference)),
      ...blockReferences.map((reference) => transaction.get(reference)),
    ]);
    const placeSnapshots = capacitySnapshots.slice(0, ALL_PLACE_CODES.length);
    const blockSnapshots = capacitySnapshots.slice(ALL_PLACE_CODES.length);

    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    if (
      ALL_PLACE_CODES.some(
        (_code, index) => !placeSnapshots[index]?.exists && !blockSnapshots[index]?.exists,
      )
    ) {
      throw new ScreeningRuleError("Todavía quedan lugares disponibles en la sala.");
    }
    const ownerReservation = ownerReservationSnapshot.exists
      ? (ownerReservationSnapshot.data() as ReservationDocument)
      : null;
    const ownerWaitlist = ownerWaitlistSnapshot.exists
      ? (ownerWaitlistSnapshot.data() as WaitlistDocument)
      : null;
    if (
      (!ownerReservation || ownerReservation.kind !== "self") &&
      (!ownerWaitlist || ownerWaitlist.kind !== "self")
    ) {
      throw new ScreeningRuleError("Primero tenés que reservar tu lugar o entrar en espera.");
    }
    if (plusOneSnapshot.exists) {
      throw new ScreeningRuleError("Ya agregaste un +1 a esta función.");
    }
    if (guestReservationSnapshot.exists || guestWaitlistSnapshot.exists) {
      throw new ScreeningRuleError("Esa persona ya está en la función.");
    }

    let displayName = enteredName;
    if (registeredGuestMemberId) {
      if (
        !guestMemberSnapshot?.exists ||
        (guestMemberSnapshot.data() as { active?: unknown }).active !== true
      ) {
        throw new ScreeningRuleError("Ese miembro no está disponible.");
      }
      const registeredName = (guestMemberSnapshot.data() as { name?: unknown }).name;
      if (typeof registeredName === "string" && registeredName.trim()) {
        displayName = registeredName.trim();
      }
    }

    let slot: ReturnType<typeof claimWaitlistSlot>;
    try {
      slot = claimWaitlistSlot(
        stateSnapshot.exists ? (stateSnapshot.data() as WaitlistStateDocument) : null,
      );
    } catch (error) {
      throw new ScreeningRuleError(
        error instanceof WaitlistFullError ? error.message : "No pudimos validar la lista.",
      );
    }

    const now = Timestamp.now();
    transaction.create(guestWaitlistReference, {
      reservationId: guestReservationId,
      memberId: registeredGuestMemberId,
      displayName,
      kind: "guest",
      bookedByMemberId: member.id,
      order: slot.order,
      createdAt: now,
    } satisfies WaitlistDocument);
    transaction.create(plusOneReference, {
      memberId: registeredGuestMemberId,
      reservationId: guestReservationId,
      memberName: displayName,
      placeCode: null,
      waitlistEntryId: guestReservationId,
      createdAt: now,
      updatedAt: now,
    } satisfies PlusOneDocument);
    transaction.set(stateReference, { ...slot.state, updatedAt: now } satisfies WaitlistStateDocument);
    return slot.order;
  });
}

export async function blockPlace(
  screeningId: string,
  placeCode: unknown,
  blockedByMemberId: string,
) {
  if (
    !validDocumentId(screeningId) ||
    !isPlaceCode(placeCode) ||
    !validDocumentId(blockedByMemberId)
  ) {
    throw new ScreeningRuleError("Elegí un lugar válido.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const placeReference = screeningReference.collection("places").doc(placeCode);
  const blockReference = screeningReference.collection("blocks").doc(placeCode);

  return firestore.runTransaction(async (transaction) => {
    const [screeningSnapshot, pointerSnapshot, placeSnapshot, blockSnapshot] =
      await Promise.all([
        transaction.get(screeningReference),
        transaction.get(pointerReference),
        transaction.get(placeReference),
        transaction.get(blockReference),
      ]);
    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    if (placeSnapshot.exists) {
      throw new ScreeningRuleError("Ese lugar está ocupado. Primero mové o cancelá la reserva.");
    }
    if (blockSnapshot.exists) {
      throw new ScreeningRuleError("Ese lugar ya está bloqueado.");
    }

    transaction.create(blockReference, {
      placeCode,
      blockedByMemberId,
      createdAt: Timestamp.now(),
    } satisfies BlockDocument);
    return placeCode;
  });
}

export async function unblockPlace(screeningId: string, placeCode: unknown) {
  if (!validDocumentId(screeningId) || !isPlaceCode(placeCode)) {
    throw new ScreeningRuleError("Elegí un lugar válido.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const placeReference = screeningReference.collection("places").doc(placeCode);
  const blockReference = screeningReference.collection("blocks").doc(placeCode);

  return firestore.runTransaction(async (transaction) => {
    const [screeningSnapshot, pointerSnapshot, placeSnapshot, blockSnapshot] =
      await Promise.all([
        transaction.get(screeningReference),
        transaction.get(pointerReference),
        transaction.get(placeReference),
        transaction.get(blockReference),
      ]);
    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }
    if (placeSnapshot.exists) {
      throw new ScreeningRuleError("Ese lugar está ocupado y no puede estar bloqueado.");
    }
    if (!blockSnapshot.exists) {
      throw new ScreeningRuleError("Ese lugar ya está disponible.");
    }

    await applyPromotionsAfterCancellation({
      transaction,
      screeningReference,
      removedReservationIds: [],
      releasedPlaceCodes: [placeCode],
    });
    transaction.delete(blockReference);
    return placeCode;
  });
}

export async function reorderWaitlistEntry(
  screeningId: string,
  reservationId: string,
  direction: unknown,
) {
  if (
    !validDocumentId(screeningId) ||
    !validDocumentId(reservationId) ||
    !["up", "down"].includes(typeof direction === "string" ? direction : "")
  ) {
    throw new ScreeningRuleError("El movimiento de la espera no es válido.");
  }

  const firestore = getAdminFirestore();
  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const pointerReference = firestore.collection("system").doc("openScreening");
  const waitlistQuery = screeningReference.collection("waitlist").orderBy("order", "asc").limit(5);

  return firestore.runTransaction(async (transaction) => {
    const [screeningSnapshot, pointerSnapshot, waitlistSnapshot] = await Promise.all([
      transaction.get(screeningReference),
      transaction.get(pointerReference),
      transaction.get(waitlistQuery),
    ]);
    if (!screeningSnapshot.exists) {
      throw new ScreeningRuleError("La función ya no existe.");
    }
    const screening = screeningSnapshot.data() as ScreeningDocument;
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (screening.status !== "open" || currentId !== screeningId) {
      throw new ScreeningRuleError("Las reservas de esta función no están abiertas.");
    }

    const index = waitlistSnapshot.docs.findIndex((snapshot) => snapshot.id === reservationId);
    const offset = direction === "up" ? -1 : 1;
    const adjacentIndex = index + offset;
    if (index < 0) {
      throw new ScreeningRuleError("Esa persona ya no está en la lista de espera.");
    }
    if (adjacentIndex < 0 || adjacentIndex >= waitlistSnapshot.size) {
      throw new ScreeningRuleError("Esa persona ya está en el extremo de la lista.");
    }

    const currentSnapshot = waitlistSnapshot.docs[index];
    const adjacentSnapshot = waitlistSnapshot.docs[adjacentIndex];
    const current = currentSnapshot.data() as WaitlistDocument;
    const adjacent = adjacentSnapshot.data() as WaitlistDocument;
    if (!Number.isFinite(current.order) || !Number.isFinite(adjacent.order)) {
      throw new ScreeningRuleError("No pudimos verificar el orden de la espera.");
    }

    transaction.update(currentSnapshot.ref, { order: adjacent.order });
    transaction.update(adjacentSnapshot.ref, { order: current.order });
    return adjacentIndex + 1;
  });
}

export async function getOpenScreeningForMember(memberId: string): Promise<OpenScreening | null> {
  const firestore = getAdminFirestore();
  const pointerSnapshot = await firestore.collection("system").doc("openScreening").get();
  if (!pointerSnapshot.exists) return null;

  const screeningId = (pointerSnapshot.data() as { screeningId?: unknown }).screeningId;
  if (typeof screeningId !== "string" || !validDocumentId(screeningId)) return null;

  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const [
    screeningSnapshot,
    placesSnapshot,
    reservationSnapshot,
    plusOneSnapshot,
    waitlistSnapshot,
    blocksSnapshot,
  ] =
    await Promise.all([
      screeningReference.get(),
      screeningReference.collection("places").get(),
      screeningReference.collection("reservations").doc(memberId).get(),
      screeningReference.collection("plusOnes").doc(memberId).get(),
      screeningReference.collection("waitlist").orderBy("order", "asc").limit(5).get(),
      screeningReference.collection("blocks").get(),
    ]);
  if (!screeningSnapshot.exists) return null;

  const document = screeningSnapshot.data() as ScreeningDocument;
  if (!["open", "closed"].includes(document.status)) return null;

  const places = placesSnapshot.docs
    .map((place) => ({ code: place.id, document: place.data() as PlaceDocument }))
    .filter((place): place is { code: PlaceCode; document: PlaceDocument } =>
      isPlaceCode(place.code),
    );
  const rawWaitlist = waitlistSnapshot.docs
    .map((snapshot) => snapshot.data() as WaitlistDocument)
    .filter(
      (entry) =>
        validDocumentId(entry.reservationId) &&
        typeof entry.displayName === "string" &&
        Boolean(entry.displayName.trim()) &&
        ["self", "guest"].includes(entry.kind),
    );
  const memberIds = [
    ...new Set(
      [
        ...places.flatMap(({ document: place }) => [
          place.memberId,
          place.bookedByMemberId,
        ]),
        ...rawWaitlist.flatMap((entry) => [entry.memberId, entry.bookedByMemberId]),
      ].filter((id): id is string => typeof id === "string" && validDocumentId(id)),
    ),
  ];
  const memberSnapshots = memberIds.length
    ? await firestore.getAll(
        ...memberIds.map((id) => firestore.collection("members").doc(id)),
      )
    : [];
  const memberNames = new Map<string, string>(
    memberSnapshots.flatMap((memberSnapshot): [string, string][] => {
      if (!memberSnapshot.exists) return [];
      const name = (memberSnapshot.data() as { name?: unknown }).name;
      return typeof name === "string" && name.trim()
        ? [[memberSnapshot.id, name.trim()]]
        : [];
    }),
  );
  const ownReservation = reservationSnapshot.exists
    ? (reservationSnapshot.data() as ReservationDocument)
    : null;
  const plusOne = plusOneSnapshot.exists
    ? (plusOneSnapshot.data() as PlusOneDocument)
    : null;
  const guestReservationId = plusOne ? plusOneReservationId(plusOne) : null;
  const guestReservation =
    plusOne && guestReservationId && isPlaceCode(plusOne.placeCode)
      ? {
          memberId: plusOne.memberId,
          memberName:
            typeof plusOne.memberName === "string" && plusOne.memberName.trim()
              ? plusOne.memberName
              : typeof plusOne.memberId === "string" &&
                  typeof memberNames.get(plusOne.memberId) === "string"
                ? (memberNames.get(plusOne.memberId) as string)
                : "Invitado",
          placeCode: plusOne.placeCode,
        }
      : null;
  const waitlist: WaitlistEntry[] = rawWaitlist.map((entry, index) => {
    const bookedByMemberId =
      typeof entry.bookedByMemberId === "string"
        ? entry.bookedByMemberId
        : entry.reservationId;
    return {
      reservationId: entry.reservationId,
      memberId: entry.memberId,
      displayName: entry.displayName,
      kind: entry.kind,
      isMine: entry.reservationId === memberId,
      isMyGuest: entry.kind === "guest" && bookedByMemberId === memberId,
      position: index + 1,
      bookedByMemberId,
      bookedByName: memberNames.get(bookedByMemberId) ?? "Miembro del club",
    };
  });
  const ownWaitlistEntry =
    waitlist.find((entry) => entry.reservationId === memberId) ?? null;
  const guestWaitlistEntry = guestReservationId
    ? waitlist.find(
        (entry) => entry.reservationId === guestReservationId && entry.isMyGuest,
      ) ?? null
    : null;

  return {
    ...screeningFromDocument(screeningSnapshot.id, document),
    occupancy: places.map(({ code, document: place }) => {
      const bookedByMemberId = place.bookedByMemberId ?? place.memberId;
      return {
        placeCode: code,
        memberId: place.memberId,
        memberName:
          typeof place.displayName === "string" && place.displayName.trim()
            ? place.displayName
            : memberNames.get(place.memberId) ?? "Miembro del club",
        isMine: place.memberId === memberId,
        isMyGuest: place.kind === "guest" && bookedByMemberId === memberId,
        kind: place.kind === "guest" ? "guest" : "self",
        bookedByMemberId,
        bookedByName: memberNames.get(bookedByMemberId) ?? "Miembro del club",
      };
    }),
    ownPlaceCode:
      ownReservation && isPlaceCode(ownReservation.placeCode)
        ? ownReservation.placeCode
        : null,
    ownReservationKind:
      ownReservation && ["self", "guest"].includes(ownReservation.kind)
        ? ownReservation.kind
        : null,
    guestReservation,
    waitlist,
    ownWaitlistEntry,
    guestWaitlistEntry,
    blockedPlaceCodes: blocksSnapshot.docs.flatMap((snapshot): PlaceCode[] => {
      if (!isPlaceCode(snapshot.id)) return [];
      const block = snapshot.data() as BlockDocument;
      return block.placeCode === snapshot.id ? [snapshot.id] : [];
    }),
  };
}
