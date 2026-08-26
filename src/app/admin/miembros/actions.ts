"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import { CritiqueError, updateFilmAttendance } from "@/lib/critiques";
import { MemberAdminError, setMemberActive, updateMemberName } from "@/lib/members";

export type MemberActionState = {
  error: string | null;
  message: string | null;
};

function refreshMembers(memberId?: string) {
  revalidatePath("/admin/miembros");
  revalidatePath("/historial");
  if (memberId) revalidatePath(`/admin/miembros/${memberId}`);
}

export async function updateMemberNameAction(
  _previous: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") {
    return { error: "Esa persona no es válida.", message: null };
  }
  try {
    await updateMemberName(id, formData.get("name"));
    refreshMembers(id);
    return { error: null, message: "Nombre actualizado." };
  } catch (error) {
    return {
      error: error instanceof MemberAdminError ? error.message : "No se pudo guardar el nombre.",
      message: null,
    };
  }
}

export async function setMemberActiveAction(
  _previous: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  await requireAdmin();
  const id = formData.get("id");
  const active = formData.get("active") === "true";
  if (typeof id !== "string") {
    return { error: "Esa persona no es válida.", message: null };
  }
  try {
    await setMemberActive(id, active);
    refreshMembers(id);
    return { error: null, message: active ? "Miembro reactivado." : "Miembro desactivado." };
  } catch (error) {
    return {
      error: error instanceof MemberAdminError ? error.message : "No se pudo cambiar el estado.",
      message: null,
    };
  }
}

export async function updateAttendanceAction(
  _previous: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  await requireAdmin();
  const filmId = formData.get("filmId");
  const personId = formData.get("personId");
  const memberId = formData.get("memberId");
  if (typeof filmId !== "string" || typeof personId !== "string") {
    return { error: "La asistencia no es válida.", message: null };
  }
  try {
    await updateFilmAttendance(filmId, personId, formData.get("status"));
    refreshMembers(typeof memberId === "string" ? memberId : undefined);
    return { error: null, message: "Asistencia actualizada." };
  } catch (error) {
    return {
      error:
        error instanceof CritiqueError || error instanceof Error
          ? error.message
          : "No se pudo actualizar la asistencia.",
      message: null,
    };
  }
}
