import { parseDisplayName } from "./member-admin-policy";
import { isPlaceCode, type PlaceCode } from "./room";

export type AdminReservationPerson =
  | { mode: "member"; memberId: string }
  | { mode: "name"; name: string }
  | { mode: "account"; name: string; email: string };

export type AdminReservationInput = {
  screeningId: string;
  placeCode: PlaceCode;
  requestId: string;
  person: AdminReservationPerson;
};

export class AdminReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminReservationError";
  }
}

export function parseMemberEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLocaleLowerCase("en-US") : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
    throw new AdminReservationError("Escribí un mail válido.");
  }
  return email;
}

export function parseAdminReservationInput(formData: FormData): AdminReservationInput {
  const screeningId = formData.get("screeningId");
  const placeCode = formData.get("placeCode");
  const requestId = formData.get("requestId");
  if (typeof screeningId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(screeningId) || !isPlaceCode(placeCode)) {
    throw new AdminReservationError("Elegí un lugar disponible de esta función.");
  }
  if (typeof requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(requestId)) {
    throw new AdminReservationError("Recargá la página para iniciar una reserva nueva.");
  }
  const mode = formData.get("mode");
  let person: AdminReservationPerson;
  if (mode === "member") {
    const memberId = formData.get("memberId");
    if (typeof memberId !== "string" || !memberId || memberId.length > 100 || memberId.includes("/")) {
      throw new AdminReservationError("Elegí un miembro del club.");
    }
    person = { mode, memberId };
  } else if (mode === "name" || mode === "account") {
    const name = parseDisplayName(formData.get("name"));
    person = mode === "name" ? { mode, name } : { mode, name, email: parseMemberEmail(formData.get("email")) };
  } else {
    throw new AdminReservationError("Elegí cómo querés registrar a esta persona.");
  }
  return { screeningId, placeCode, requestId, person };
}
