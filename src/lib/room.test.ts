import { describe, expect, it } from "vitest";

import {
  AISLE_FLOOR_BY_ROW,
  ALL_PLACE_CODES,
  FLOOR_CODES,
  isPlaceCode,
  isSeatCode,
  placeDisplayLabel,
  ROOM_ROWS,
  SEAT_CODES,
} from "./room";

describe("fixed room", () => {
  it("contains twelve seats in three rows and two floor places", () => {
    expect(ROOM_ROWS).toHaveLength(3);
    expect(ROOM_ROWS.every((row) => row.length === 4)).toBe(true);
    expect(SEAT_CODES).toHaveLength(12);
    expect(FLOOR_CODES).toHaveLength(2);
  });

  it("uses a unique code for every place", () => {
    expect(new Set(ALL_PLACE_CODES).size).toBe(14);
  });

  it("places the floor spots in the center aisle of rows B and C", () => {
    expect(AISLE_FLOOR_BY_ROW[0]).toBeNull();
    expect(AISLE_FLOOR_BY_ROW[1]?.code).toBe("P1");
    expect(AISLE_FLOOR_BY_ROW[2]?.code).toBe("P2");
  });

  it("distinguishes normal seats from all reservable places", () => {
    expect(isSeatCode("A1")).toBe(true);
    expect(isSeatCode("C4")).toBe(true);
    expect(isSeatCode("P1")).toBe(false);
    expect(isPlaceCode("P1")).toBe(true);
    expect(isPlaceCode("P2")).toBe(true);
    expect(isSeatCode("D1")).toBe(false);
    expect(isPlaceCode("D1")).toBe(false);
  });

  it("labels the aisle places as PISO 1 and PISO 2", () => {
    expect(placeDisplayLabel("P1")).toBe("PISO 1");
    expect(placeDisplayLabel("P2")).toBe("PISO 2");
    expect(placeDisplayLabel("B3")).toBe("B3");
  });
});
