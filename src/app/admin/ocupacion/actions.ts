"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import { AdminReservationError, parseAdminReservationInput } from "@/lib/admin-reservation-policy";
import { reserveSeatAsAdmin } from "@/lib/admin-reservations";
import { MemberAdminError } from "@/lib/member-admin-policy";
import {
  blockPlace,
  cancelOwnReservation,
  cancelOwnWaitlist,
  changeOwnSeat,
  reorderWaitlistEntry,
  ScreeningRuleError,
  unblockPlace,
} from "@/lib/screenings";

export type OccupancyActionState = {
  error: string | null;
  message: string | null;
};

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function failure(error: unknown, fallback: string): OccupancyActionState {
  return {
    error: error instanceof ScreeningRuleError ? error.message : fallback,
    message: null,
  };
}

function refreshOccupancy() {
  revalidatePath("/admin/ocupacion");
  revalidatePath("/admin/funciones");
  revalidatePath("/club");
  revalidatePath("/admin/miembros");
  revalidatePath("/admin/cartelera");
  revalidatePath("/admin/critica");
}

export async function reserveSeatAdminAction(
  _previousState: OccupancyActionState,
  formData: FormData,
): Promise<OccupancyActionState> {
  const admin = await requireAdmin();
  try {
    const result = await reserveSeatAsAdmin(admin.id, parseAdminReservationInput(formData));
    refreshOccupancy();
    return {
      error: null,
      message: `${result.placeCode} reservado para ${result.name}.${result.createdMember ? " Su ficha ya está creada; puede entrar con Google usando ese mail." : ""}${result.exemptionGranted ? " Se registró una excepción de votación para esta función." : ""}`,
    };
  } catch (error) {
    return {
      error: error instanceof AdminReservationError || error instanceof MemberAdminError
        ? error.message : "No se pudo reservar. Tus datos siguen en el formulario; podés reintentar.",
      message: null,
    };
  }
}

export async function moveReservationAction(
  _previousState: OccupancyActionState,
  formData: FormData,
): Promise<OccupancyActionState> {
  await requireAdmin();
  try {
    const placeCode = await changeOwnSeat(
      field(formData, "screeningId"),
      { id: field(formData, "reservationId") },
      field(formData, "placeCode"),
    );
    refreshOccupancy();
    return { error: null, message: `Reserva movida a ${placeCode}.` };
  } catch (error) {
    return failure(error, "No se pudo mover la reserva.");
  }
}

export async function cancelReservationAdminAction(
  _previousState: OccupancyActionState,
  formData: FormData,
): Promise<OccupancyActionState> {
  await requireAdmin();
  try {
    await cancelOwnReservation(
      field(formData, "screeningId"),
      { id: field(formData, "reservationId") },
    );
    refreshOccupancy();
    return { error: null, message: "Reserva cancelada." };
  } catch (error) {
    return failure(error, "No se pudo cancelar la reserva.");
  }
}

export async function cancelWaitlistAdminAction(
  _previousState: OccupancyActionState,
  formData: FormData,
): Promise<OccupancyActionState> {
  await requireAdmin();
  try {
    await cancelOwnWaitlist(
      field(formData, "screeningId"),
      { id: field(formData, "reservationId") },
    );
    refreshOccupancy();
    return { error: null, message: "Persona eliminada de la lista de espera." };
  } catch (error) {
    return failure(error, "No se pudo modificar la lista de espera.");
  }
}

export async function blockPlaceAction(
  _previousState: OccupancyActionState,
  formData: FormData,
): Promise<OccupancyActionState> {
  const admin = await requireAdmin();
  try {
    const placeCode = await blockPlace(
      field(formData, "screeningId"),
      field(formData, "placeCode"),
      admin.id,
    );
    refreshOccupancy();
    return { error: null, message: `${placeCode} quedó bloqueado.` };
  } catch (error) {
    return failure(error, "No se pudo bloquear el lugar.");
  }
}

export async function unblockPlaceAction(
  _previousState: OccupancyActionState,
  formData: FormData,
): Promise<OccupancyActionState> {
  await requireAdmin();
  try {
    const placeCode = await unblockPlace(
      field(formData, "screeningId"),
      field(formData, "placeCode"),
    );
    refreshOccupancy();
    return { error: null, message: `${placeCode} volvió a estar disponible.` };
  } catch (error) {
    return failure(error, "No se pudo desbloquear el lugar.");
  }
}

export async function reorderWaitlistAction(
  _previousState: OccupancyActionState,
  formData: FormData,
): Promise<OccupancyActionState> {
  await requireAdmin();
  try {
    await reorderWaitlistEntry(
      field(formData, "screeningId"),
      field(formData, "reservationId"),
      field(formData, "direction"),
    );
    refreshOccupancy();
    return { error: null, message: "Orden de espera actualizado." };
  } catch (error) {
    return failure(error, "No se pudo reordenar la lista de espera.");
  }
}
