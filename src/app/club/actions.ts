"use server";

import { revalidatePath } from "next/cache";

import { requireMember } from "@/lib/authz";
import {
  cancelGuestReservation,
  cancelGuestWaitlist,
  cancelOwnReservation,
  cancelOwnWaitlist,
  changeGuestSeat,
  changeOwnSeat,
  joinGuestWaitlist,
  joinOwnWaitlist,
  reserveGuestSeat,
  reserveOwnSeat,
  ScreeningRuleError,
} from "@/lib/screenings";

export type ReservationActionState = {
  error: string | null;
  message: string | null;
};

export async function reserveOwnSeatAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  const placeCode = formData.get("placeCode");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    const reservedPlace = await reserveOwnSeat(screeningId, member, placeCode);
    revalidatePath("/club");
    revalidatePath("/admin/funciones");
    return {
      error: null,
      message: `Selección completada. Reservaste el lugar ${reservedPlace}. Ya tenés tu butaca para la función.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos guardar tu reserva. Probá otra vez.",
      message: null,
    };
  }
}

export async function reservePartyAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  const placeCode = formData.get("placeCode");
  const guestPlaceCode = formData.get("guestPlaceCode");
  const hasGuest = typeof guestPlaceCode === "string" && guestPlaceCode.length > 0;
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    const reservedPlace = await reserveOwnSeat(screeningId, member, placeCode);
    if (!hasGuest) {
      revalidatePath("/club");
      revalidatePath("/admin/funciones");
      return {
        error: null,
        message: `Selección completada. Reservaste el lugar ${reservedPlace}. Ya tenés tu butaca para la función.`,
      };
    }

    try {
      const guestPlace = await reserveGuestSeat(
        screeningId,
        member,
        formData.get("guestMemberId"),
        formData.get("guestName"),
        guestPlaceCode,
      );
      const guestLabel =
        typeof formData.get("guestName") === "string" && formData.get("guestName")?.toString().trim()
          ? formData.get("guestName")?.toString().trim()
          : "tu +1";
      revalidatePath("/club");
      revalidatePath("/admin/funciones");
      return {
        error: null,
        message: `Selección completada. Vos en ${reservedPlace} y ${guestLabel} en ${guestPlace}. Los dos lugares quedaron confirmados.`,
      };
    } catch (error) {
      revalidatePath("/club");
      revalidatePath("/admin/funciones");
      return {
        error:
          error instanceof ScreeningRuleError
            ? `Reservaste ${reservedPlace}. El +1 no se guardó: ${error.message}`
            : `Reservaste ${reservedPlace}. No pudimos guardar el lugar del +1.`,
        message: null,
      };
    }
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos guardar tus lugares. Probá otra vez.",
      message: null,
    };
  }
}

export async function joinOwnWaitlistAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    const position = await joinOwnWaitlist(screeningId, member);
    revalidatePath("/club");
    return { error: null, message: `Entraste en la lista de espera, posición ${position}.` };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos agregarte a la lista de espera.",
      message: null,
    };
  }
}

export async function cancelOwnWaitlistAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    await cancelOwnWaitlist(screeningId, member);
    revalidatePath("/club");
    return { error: null, message: "Saliste de la lista de espera." };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos sacarte de la lista de espera.",
      message: null,
    };
  }
}

export async function joinGuestWaitlistAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    const position = await joinGuestWaitlist(
      screeningId,
      member,
      formData.get("guestMemberId"),
      formData.get("guestName"),
    );
    revalidatePath("/club");
    return { error: null, message: `Tu +1 entró en espera, posición ${position}.` };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos agregar a tu +1 a la lista de espera.",
      message: null,
    };
  }
}

export async function cancelGuestWaitlistAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    await cancelGuestWaitlist(screeningId, member);
    revalidatePath("/club");
    return { error: null, message: "Tu +1 salió de la lista de espera." };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos sacar a tu +1 de la lista de espera.",
      message: null,
    };
  }
}

export async function reserveGuestSeatAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  const guestMemberId = formData.get("guestMemberId");
  const guestName = formData.get("guestName");
  const placeCode = formData.get("placeCode");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    const reservedPlace = await reserveGuestSeat(
      screeningId,
      member,
      guestMemberId,
      guestName,
      placeCode,
    );
    revalidatePath("/club");
    return {
      error: null,
      message: `Selección completada. El lugar ${reservedPlace} quedó reservado para tu +1.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos guardar la reserva de tu +1. Probá otra vez.",
      message: null,
    };
  }
}

export async function changeGuestSeatAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  const placeCode = formData.get("placeCode");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    const reservedPlace = await changeGuestSeat(screeningId, member, placeCode);
    revalidatePath("/club");
    return {
      error: null,
      message: `Cambio confirmado. El lugar de tu +1 ahora es ${reservedPlace}.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos cambiar el asiento de tu +1. Probá otra vez.",
      message: null,
    };
  }
}

export async function cancelGuestReservationAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    await cancelGuestReservation(screeningId, member);
    revalidatePath("/club");
    return { error: null, message: "La reserva de tu +1 fue cancelada." };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos cancelar la reserva de tu +1. Probá otra vez.",
      message: null,
    };
  }
}

export async function changeOwnSeatAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  const placeCode = formData.get("placeCode");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    const reservedPlace = await changeOwnSeat(screeningId, member, placeCode);
    revalidatePath("/club");
    revalidatePath("/admin/funciones");
    return {
      error: null,
      message: `Cambio confirmado. Tu lugar ahora es ${reservedPlace}.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos cambiar tu lugar. Probá otra vez.",
      message: null,
    };
  }
}

export async function cancelOwnReservationAction(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const member = await requireMember();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    await cancelOwnReservation(screeningId, member);
    revalidatePath("/club");
    revalidatePath("/admin/funciones");
    return { error: null, message: "Tu reserva fue cancelada." };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No pudimos cancelar tu reserva. Probá otra vez.",
      message: null,
    };
  }
}
