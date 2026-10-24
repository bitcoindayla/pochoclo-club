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

export type AdminWaitlistInput = {
  screeningId: string;
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

const REQUEST_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function parseRequestId(value: unknown) {
  if (typeof value !== "string" || !REQUEST_ID.test(value)) {
    throw new AdminReservationError("Recargá la página para iniciar una reserva nueva.");
  }
  return value;
}

function parseScreeningId(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
    throw new AdminReservationError("Elegí la función abierta.");
  }
  return value;
}

export function parseAdminPerson(formData: FormData): AdminReservationPerson {
  const mode = formData.get("mode");
  if (mode === "member") {
    const memberId = formData.get("memberId");
    if (typeof memberId !== "string" || !memberId || memberId.length > 100 || memberId.includes("/")) {
      throw new AdminReservationError("Elegí un miembro del club.");
    }
    return { mode, memberId };
  }
  if (mode === "name" || mode === "account") {
    const name = parseDisplayName(formData.get("name"));
    return mode === "name" ? { mode, name } : { mode, name, email: parseMemberEmail(formData.get("email")) };
  }
  throw new AdminReservationError("Elegí cómo querés registrar a esta persona.");
}

export function parseAdminReservationInput(formData: FormData): AdminReservationInput {
  const placeCode = formData.get("placeCode");
  if (!isPlaceCode(placeCode)) {
    throw new AdminReservationError("Elegí un lugar disponible de esta función.");
  }
  try {
    return {
      screeningId: parseScreeningId(formData.get("screeningId")),
      placeCode,
      requestId: parseRequestId(formData.get("requestId")),
      person: parseAdminPerson(formData),
    };
  } catch (error) {
    if (error instanceof AdminReservationError && error.message === "Elegí la función abierta.") {
      throw new AdminReservationError("Elegí un lugar disponible de esta función.");
    }
    throw error;
  }
}

export function parseAdminWaitlistInput(formData: FormData): AdminWaitlistInput {
  return {
    screeningId: parseScreeningId(formData.get("screeningId")),
    requestId: parseRequestId(formData.get("requestId")),
    person: parseAdminPerson(formData),
  };
}
