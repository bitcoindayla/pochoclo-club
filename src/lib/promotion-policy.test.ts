import { describe, expect, it } from "vitest";

import {
  planPromotions,
  type PromotionOccupant,
  type PromotionWaitEntry,
} from "./promotion-policy";

function occupant(
  placeCode: PromotionOccupant["placeCode"],
  reservationId: string,
  enteredPlaceAt: number,
): PromotionOccupant {
  return {
    placeCode,
    reservationId,
    memberId: reservationId,
    displayName: reservationId,
    kind: "self",
    bookedByMemberId: reservationId,
    enteredPlaceAt,
  };
}

function waiting(reservationId: string, order: number): PromotionWaitEntry {
  return {
    reservationId,
    memberId: reservationId,
    displayName: reservationId,
    kind: "self",
    bookedByMemberId: reservationId,
    order,
  };
}

describe("automatic promotions", () => {
  it("moves the oldest floor occupant to a released seat and fills the floor from wait", () => {
    const plan = planPromotions({
      places: [occupant("A1", "cancelled", 1), occupant("P1", "old-floor", 2), occupant("P2", "new-floor", 3)],
      waitlist: [waiting("first-wait", 1), waiting("second-wait", 2)],
      removedReservationIds: ["cancelled"],
      operationTime: 10,
    });

    expect(plan.moves).toMatchObject([{ occupant: { reservationId: "old-floor" }, from: "P1", to: "A1" }]);
    expect(plan.promotions).toMatchObject([{ entry: { reservationId: "first-wait" }, to: "P1" }]);
    expect(plan.remainingWaitlist.map((entry) => entry.reservationId)).toEqual(["second-wait"]);
  });

  it("moves the first waiting person directly into a released floor place", () => {
    const plan = planPromotions({
      places: [occupant("P2", "cancelled", 1)],
      waitlist: [waiting("first-wait", 4)],
      removedReservationIds: ["cancelled"],
      operationTime: 10,
    });

    expect(plan.moves).toHaveLength(0);
    expect(plan.promotions).toMatchObject([{ entry: { reservationId: "first-wait" }, to: "P2" }]);
    expect(plan.remainingWaitlist).toHaveLength(0);
  });

  it("uses both original floor occupants when two seats are released together", () => {
    const plan = planPromotions({
      places: [
        occupant("A1", "cancelled-a", 1),
        occupant("B1", "cancelled-b", 1),
        occupant("P1", "old-floor", 2),
        occupant("P2", "new-floor", 3),
      ],
      waitlist: [waiting("wait-a", 1), waiting("wait-b", 2)],
      removedReservationIds: ["cancelled-a", "cancelled-b"],
      operationTime: 10,
    });

    expect(plan.moves.map((move) => [move.occupant.reservationId, move.to])).toEqual([
      ["old-floor", "A1"],
      ["new-floor", "B1"],
    ]);
    expect(plan.promotions.map((promotion) => [promotion.entry.reservationId, promotion.to])).toEqual([
      ["wait-a", "P1"],
      ["wait-b", "P2"],
    ]);
  });

  it("excludes a cancelled guest from the waitlist before promoting", () => {
    const plan = planPromotions({
      places: [occupant("P1", "cancelled", 1)],
      waitlist: [waiting("removed-wait", 1), waiting("promoted", 2)],
      removedReservationIds: ["cancelled"],
      removedWaitlistIds: ["removed-wait"],
      operationTime: 10,
    });

    expect(plan.promotions[0].entry.reservationId).toBe("promoted");
  });

  it("treats an unblocked place like newly released capacity", () => {
    const plan = planPromotions({
      places: [occupant("P1", "floor", 1)],
      waitlist: [waiting("promoted", 1)],
      removedReservationIds: [],
      releasedPlaceCodes: ["A1"],
      operationTime: 10,
    });

    expect(plan.moves).toMatchObject([{ occupant: { reservationId: "floor" }, to: "A1" }]);
    expect(plan.promotions).toMatchObject([{ entry: { reservationId: "promoted" }, to: "P1" }]);
  });
});
