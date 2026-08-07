"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import { parseScreeningInput } from "@/lib/screening-policy";
import {
  closeScreening,
  createScreening,
  openScreening,
  ScreeningRuleError,
} from "@/lib/screenings";

export type ScreeningActionState = {
  error: string | null;
  message: string | null;
};

export async function createScreeningAction(
  _previousState: ScreeningActionState,
  formData: FormData,
): Promise<ScreeningActionState> {
  const admin = await requireAdmin();

  try {
    const input = parseScreeningInput(formData);
    await createScreening(admin.id, input);
    revalidatePath("/admin/funciones");
    return { error: null, message: "Función creada como borrador." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear la función.",
      message: null,
    };
  }
}

export async function openScreeningAction(
  _previousState: ScreeningActionState,
  formData: FormData,
): Promise<ScreeningActionState> {
  await requireAdmin();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    await openScreening(screeningId);
    revalidatePath("/admin/funciones");
    revalidatePath("/club");
    return { error: null, message: "Reservas abiertas." };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No se pudieron abrir las reservas.",
      message: null,
    };
  }
}

export async function closeScreeningAction(
  _previousState: ScreeningActionState,
  formData: FormData,
): Promise<ScreeningActionState> {
  await requireAdmin();
  const screeningId = formData.get("screeningId");
  if (typeof screeningId !== "string") {
    return { error: "La función no es válida.", message: null };
  }

  try {
    await closeScreening(screeningId);
    revalidatePath("/admin/funciones");
    revalidatePath("/admin/ocupacion");
    revalidatePath("/club");
    return { error: null, message: "Reservas cerradas. La función quedó en modo lectura." };
  } catch (error) {
    return {
      error:
        error instanceof ScreeningRuleError
          ? error.message
          : "No se pudieron cerrar las reservas.",
      message: null,
    };
  }
}
