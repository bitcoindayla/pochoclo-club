export const ROOM_ROWS = [
  [
    { code: "A1", name: "Justine Triet" },
    { code: "A2", name: "Sean Baker" },
    { code: "A3", name: "Ryûsuke Hamaguchi" },
    { code: "A4", name: "Yorgos Lanthimos" },
  ],
  [
    { code: "B1", name: "Ruben Östlund" },
    { code: "B2", name: "Julia Ducournau" },
    { code: "B3", name: "Hirokazu Koreeda" },
    { code: "B4", name: "Denis Villeneuve" },
  ],
  [
    { code: "C1", name: "Joachim Trier" },
    { code: "C2", name: "Park Chan-wook" },
    { code: "C3", name: "Rodrigo Sorogoyen" },
    { code: "C4", name: "Payal Kapadia" },
  ],
] as const;

export const FLOOR_PLACES = [
  { code: "P1", name: "Lucrecia Martel" },
  { code: "P2", name: "Céline Sciamma" },
] as const;

export const SEAT_CODES = ROOM_ROWS.flat().map((place) => place.code);
export const FLOOR_CODES = FLOOR_PLACES.map((place) => place.code);
export const ALL_PLACE_CODES = [...SEAT_CODES, ...FLOOR_CODES];

export type SeatCode = (typeof SEAT_CODES)[number];
export type PlaceCode = (typeof ALL_PLACE_CODES)[number];

export function isSeatCode(value: unknown): value is SeatCode {
  return typeof value === "string" && SEAT_CODES.includes(value as SeatCode);
}

export function isPlaceCode(value: unknown): value is PlaceCode {
  return typeof value === "string" && ALL_PLACE_CODES.includes(value as PlaceCode);
}
