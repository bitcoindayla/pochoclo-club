import { describe, expect, it } from "vitest";

import {
  ALL_PLACE_CODES,
  FLOOR_CODES,
  isPlaceCode,
  isSeatCode,
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

  it("distinguishes normal seats from all reservable places", () => {
    expect(isSeatCode("A1")).toBe(true);
    expect(isSeatCode("C4")).toBe(true);
    expect(isSeatCode("P1")).toBe(false);
    expect(isPlaceCode("P1")).toBe(true);
    expect(isPlaceCode("P2")).toBe(true);
    expect(isSeatCode("D1")).toBe(false);
    expect(isPlaceCode("D1")).toBe(false);
  });
});
