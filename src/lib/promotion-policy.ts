import { FLOOR_CODES, isPlaceCode, SEAT_CODES, type PlaceCode } from "./room";

export type PromotionKind = "self" | "guest";

export type PromotionOccupant = {
  placeCode: PlaceCode;
  reservationId: string;
  memberId: string;
  displayName: string | null;
  kind: PromotionKind;
  bookedByMemberId: string;
  enteredPlaceAt: number;
};

export type PromotionWaitEntry = {
  reservationId: string;
  memberId: string | null;
  displayName: string;
  kind: PromotionKind;
  bookedByMemberId: string;
  order: number;
};

export type FloorMove = {
  occupant: PromotionOccupant;
  from: PlaceCode;
  to: PlaceCode;
};

export type WaitPromotion = {
  entry: PromotionWaitEntry;
  to: PlaceCode;
};

export type PromotionPlan = {
  finalPlaces: PromotionOccupant[];
  moves: FloorMove[];
  promotions: WaitPromotion[];
  remainingWaitlist: PromotionWaitEntry[];
  affectedPlaceCodes: PlaceCode[];
};

export function planPromotions({
  places,
  waitlist,
  removedReservationIds,
  removedWaitlistIds = [],
  releasedPlaceCodes = [],
  operationTime,
}: {
  places: PromotionOccupant[];
  waitlist: PromotionWaitEntry[];
  removedReservationIds: string[];
  removedWaitlistIds?: string[];
  releasedPlaceCodes?: PlaceCode[];
  operationTime: number;
}): PromotionPlan {
  const removedReservations = new Set(removedReservationIds);
  const removedWaitlist = new Set(removedWaitlistIds);
  const validPlaces = places.filter((place) => isPlaceCode(place.placeCode));
  const releasedCodes = [...new Set([
    ...validPlaces
      .filter((place) => removedReservations.has(place.reservationId))
      .map((place) => place.placeCode),
    ...releasedPlaceCodes.filter(isPlaceCode),
  ])];
  const placesByCode = new Map(
    validPlaces
      .filter((place) => !removedReservations.has(place.reservationId))
      .map((place) => [place.placeCode, { ...place }]),
  );
  const waiting = waitlist
    .filter((entry) => !removedWaitlist.has(entry.reservationId))
    .sort((left, right) => left.order - right.order);
  const moves: FloorMove[] = [];
  const promotions: WaitPromotion[] = [];
  const affected = new Set<PlaceCode>(releasedCodes);

  function promoteWaitTo(placeCode: PlaceCode) {
    const entry = waiting.shift();
    if (!entry) return;
    const occupant: PromotionOccupant = {
      placeCode,
      reservationId: entry.reservationId,
      memberId: entry.reservationId,
      displayName: entry.displayName,
      kind: entry.kind,
      bookedByMemberId: entry.bookedByMemberId,
      enteredPlaceAt: operationTime,
    };
    placesByCode.set(placeCode, occupant);
    promotions.push({ entry, to: placeCode });
    affected.add(placeCode);
  }

  const normalReleases = releasedCodes
    .filter((code) => SEAT_CODES.includes(code as (typeof SEAT_CODES)[number]))
    .sort();
  const floorReleases = releasedCodes
    .filter((code) => FLOOR_CODES.includes(code as (typeof FLOOR_CODES)[number]))
    .sort();

  for (const releasedSeat of normalReleases) {
    const oldestFloorOccupant = [...placesByCode.values()]
      .filter((place) => FLOOR_CODES.includes(place.placeCode as (typeof FLOOR_CODES)[number]))
      .sort(
        (left, right) =>
          left.enteredPlaceAt - right.enteredPlaceAt ||
          left.placeCode.localeCompare(right.placeCode),
      )[0];

    if (oldestFloorOccupant) {
      const from = oldestFloorOccupant.placeCode;
      placesByCode.delete(from);
      placesByCode.set(releasedSeat, {
        ...oldestFloorOccupant,
        placeCode: releasedSeat,
        enteredPlaceAt: operationTime,
      });
      moves.push({ occupant: oldestFloorOccupant, from, to: releasedSeat });
      affected.add(from);
      affected.add(releasedSeat);
      promoteWaitTo(from);
    } else {
      promoteWaitTo(releasedSeat);
    }
  }

  for (const releasedFloor of floorReleases) {
    if (!placesByCode.has(releasedFloor)) promoteWaitTo(releasedFloor);
  }

  return {
    finalPlaces: [...placesByCode.values()],
    moves,
    promotions,
    remainingWaitlist: waiting,
    affectedPlaceCodes: [...affected],
  };
}
