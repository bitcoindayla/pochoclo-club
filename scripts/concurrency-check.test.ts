import { randomUUID } from "node:crypto";

import { loadEnv } from "vite";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { ALL_PLACE_CODES } from "@/lib/room";
import {
  blockPlace,
  cancelOwnReservation,
  closeScreening,
  createScreening,
  joinOwnWaitlist,
  openScreening,
  reserveOwnSeat,
} from "@/lib/screenings";

Object.assign(process.env, loadEnv("development", process.cwd(), ""));

const TEST_PREFIX = `concurrency-${randomUUID()}`;
const createdScreeningIds: string[] = [];
let originalPointerExists = false;
let originalPointerData: FirebaseFirestore.DocumentData | null = null;
let activeTemporaryScreeningId: string | null = null;

function fulfilledCount(results: PromiseSettledResult<unknown>[]) {
  return results.filter((result) => result.status === "fulfilled").length;
}

function rejectedCount(results: PromiseSettledResult<unknown>[]) {
  return results.filter((result) => result.status === "rejected").length;
}

function rejectionMessages(results: PromiseSettledResult<unknown>[]) {
  return results.flatMap((result) =>
    result.status === "rejected" && result.reason instanceof Error
      ? [result.reason.message]
      : [],
  );
}

async function createTemporaryScreening(title: string) {
  const screening = await createScreening(TEST_PREFIX, {
    localDate: "2099-01-01",
    localTime: "20:30",
    title: `${TEST_PREFIX}-${title}`,
    message: "Fixture temporal; debe eliminarse al finalizar.",
    startsAt: new Date("2099-01-01T23:30:00.000Z"),
  });
  createdScreeningIds.push(screening.id);
  await openScreening(screening.id);
  activeTemporaryScreeningId = screening.id;
  return screening.id;
}

beforeAll(async () => {
  const firestore = getAdminFirestore();
  const pointerReference = firestore.collection("system").doc("openScreening");
  const pointerSnapshot = await pointerReference.get();
  originalPointerExists = pointerSnapshot.exists;
  originalPointerData = pointerSnapshot.exists ? pointerSnapshot.data() ?? null : null;

  if (pointerSnapshot.exists) {
    const currentId = (pointerSnapshot.data() as { screeningId?: unknown }).screeningId;
    if (typeof currentId === "string") {
      const currentSnapshot = await firestore.collection("screenings").doc(currentId).get();
      const status = currentSnapshot.exists
        ? (currentSnapshot.data() as { status?: unknown }).status
        : null;
      if (status === "open") {
        throw new Error(
          "Hay una función real abierta. Cerrala antes de ejecutar la prueba de concurrencia.",
        );
      }
    }
  }
}, 30_000);

afterEach(async () => {
  if (!activeTemporaryScreeningId) return;
  const screeningId = activeTemporaryScreeningId;
  activeTemporaryScreeningId = null;
  const snapshot = await getAdminFirestore().collection("screenings").doc(screeningId).get();
  if (snapshot.exists && (snapshot.data() as { status?: unknown }).status === "open") {
    await closeScreening(screeningId);
  }
}, 30_000);

afterAll(async () => {
  const firestore = getAdminFirestore();
  const pointerReference = firestore.collection("system").doc("openScreening");

  await firestore.runTransaction(async (transaction) => {
    const pointerSnapshot = await transaction.get(pointerReference);
    const currentId = pointerSnapshot.exists
      ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
      : null;
    if (
      typeof currentId === "string" &&
      !createdScreeningIds.includes(currentId) &&
      currentId !== originalPointerData?.screeningId
    ) {
      throw new Error("El puntero cambió durante la prueba; no se restauró automáticamente.");
    }
    if (originalPointerExists && originalPointerData) {
      transaction.set(pointerReference, originalPointerData);
    } else {
      transaction.delete(pointerReference);
    }
  });

  await Promise.all(
    createdScreeningIds.map((screeningId) =>
      firestore.recursiveDelete(firestore.collection("screenings").doc(screeningId)),
    ),
  );

  const [restoredPointer, ...deletedScreenings] = await Promise.all([
    pointerReference.get(),
    ...createdScreeningIds.map((screeningId) =>
      firestore.collection("screenings").doc(screeningId).get(),
    ),
  ]);
  if (originalPointerExists) {
    expect(restoredPointer.exists).toBe(true);
    expect((restoredPointer.data() as { screeningId?: unknown }).screeningId).toBe(
      originalPointerData?.screeningId,
    );
  } else {
    expect(restoredPointer.exists).toBe(false);
  }
  expect(deletedScreenings.every((snapshot) => !snapshot.exists)).toBe(true);
}, 60_000);

describe.sequential("real Firestore concurrency", () => {
  it("preserves seat, reservation, waitlist and promotion invariants", async () => {
    const firestore = getAdminFirestore();
    const screeningId = await createTemporaryScreening("reservations");
    const screeningReference = firestore.collection("screenings").doc(screeningId);

    const sameSeatResults = await Promise.allSettled([
      reserveOwnSeat(screeningId, { id: `${TEST_PREFIX}-seat-a` }, "A1"),
      reserveOwnSeat(screeningId, { id: `${TEST_PREFIX}-seat-b` }, "A1"),
    ]);
    expect(fulfilledCount(sameSeatResults)).toBe(1);
    expect(rejectedCount(sameSeatResults)).toBe(1);
    expect(rejectionMessages(sameSeatResults).join(" ")).toMatch(/ocupado/i);

    const a1Snapshot = await screeningReference.collection("places").doc("A1").get();
    const a1Winner = (a1Snapshot.data() as { memberId: string }).memberId;

    const sameMemberResults = await Promise.allSettled([
      reserveOwnSeat(screeningId, { id: `${TEST_PREFIX}-same-member` }, "A2"),
      reserveOwnSeat(screeningId, { id: `${TEST_PREFIX}-same-member` }, "A3"),
    ]);
    expect(fulfilledCount(sameMemberResults)).toBe(1);
    expect(rejectedCount(sameMemberResults)).toBe(1);
    expect(rejectionMessages(sameMemberResults).join(" ")).toMatch(/ya tenés un lugar/i);

    const occupiedSnapshot = await screeningReference.collection("places").get();
    const occupiedCodes = new Set(occupiedSnapshot.docs.map((document) => document.id));
    for (const placeCode of ALL_PLACE_CODES) {
      if (occupiedCodes.has(placeCode)) continue;
      await reserveOwnSeat(
        screeningId,
        { id: `${TEST_PREFIX}-fill-${placeCode}` },
        placeCode,
      );
    }

    const waitMembers = Array.from({ length: 7 }, (_, index) => ({
      id: `${TEST_PREFIX}-wait-${index + 1}`,
      name: `Espera ${index + 1}`,
    }));
    const waitResults = await Promise.allSettled(
      waitMembers.map((member) => joinOwnWaitlist(screeningId, member)),
    );
    expect(fulfilledCount(waitResults)).toBe(5);
    expect(rejectedCount(waitResults)).toBe(2);
    expect(rejectionMessages(waitResults).join(" ")).toMatch(
      /lista de espera (?:está completa|ya tiene cinco)/i,
    );

    const [waitSnapshot, waitStateSnapshot] = await Promise.all([
      screeningReference.collection("waitlist").get(),
      screeningReference.collection("state").doc("waitlist").get(),
    ]);
    expect(waitSnapshot.size).toBe(5);
    expect((waitStateSnapshot.data() as { count: number }).count).toBe(5);

    const cancellationResults = await Promise.allSettled([
      cancelOwnReservation(screeningId, { id: a1Winner }),
      cancelOwnReservation(screeningId, { id: a1Winner }),
    ]);
    expect(fulfilledCount(cancellationResults)).toBe(1);
    expect(rejectedCount(cancellationResults)).toBe(1);
    expect(rejectionMessages(cancellationResults).join(" ")).toMatch(/no tenés una reserva/i);

    const [placesAfterCancellation, waitAfterCancellation, stateAfterCancellation] =
      await Promise.all([
        screeningReference.collection("places").get(),
        screeningReference.collection("waitlist").get(),
        screeningReference.collection("state").doc("waitlist").get(),
      ]);
    expect(placesAfterCancellation.size).toBe(ALL_PLACE_CODES.length);
    expect(waitAfterCancellation.size).toBe(4);
    expect((stateAfterCancellation.data() as { count: number }).count).toBe(4);

    await closeScreening(screeningId);
  }, 90_000);

  it("allows exactly one winner between blocking and reserving", async () => {
    const firestore = getAdminFirestore();
    const screeningId = await createTemporaryScreening("block-versus-reserve");
    const screeningReference = firestore.collection("screenings").doc(screeningId);

    const results = await Promise.allSettled([
      blockPlace(screeningId, "B2", `${TEST_PREFIX}-admin`),
      reserveOwnSeat(screeningId, { id: `${TEST_PREFIX}-block-racer` }, "B2"),
    ]);
    expect(fulfilledCount(results)).toBe(1);
    expect(rejectedCount(results)).toBe(1);
    expect(rejectionMessages(results).join(" ")).toMatch(/ocupado|bloqueado/i);

    const [placeSnapshot, blockSnapshot] = await Promise.all([
      screeningReference.collection("places").doc("B2").get(),
      screeningReference.collection("blocks").doc("B2").get(),
    ]);
    expect(Number(placeSnapshot.exists) + Number(blockSnapshot.exists)).toBe(1);

    await closeScreening(screeningId);
  }, 60_000);
});
