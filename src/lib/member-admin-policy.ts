export type MemberRole = "member" | "admin";

export class MemberAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemberAdminError";
  }
}

export function parseDisplayName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new MemberAdminError("Escribí el nombre.");
  }
  const name = value.trim();
  if (name.length > 100) {
    throw new MemberAdminError("El nombre puede tener hasta 100 caracteres.");
  }
  return name;
}

export function canDeactivateMember(
  members: Array<{ id: string; role: MemberRole; active: boolean }>,
  targetId: string,
): { ok: true } | { ok: false; reason: string } {
  const target = members.find((member) => member.id === targetId);
  if (!target) return { ok: false, reason: "No encontramos a esa persona." };
  if (!target.active) return { ok: true };
  if (target.role !== "admin") return { ok: true };

  const activeAdmins = members.filter((member) => member.role === "admin" && member.active);
  if (activeAdmins.length <= 1) {
    return { ok: false, reason: "No se puede desactivar al único administrador." };
  }
  return { ok: true };
}
