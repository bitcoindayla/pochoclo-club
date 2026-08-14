import "server-only";

import type { Member } from "@/lib/members";

export function menuLinksFor(member: Member | null) {
  if (!member) {
    return [{ href: "/", label: "Inicio" }];
  }

  const links = [{ href: "/club", label: "El club" }];
  if (member.role === "admin") {
    links.push(
      { href: "/", label: "Portada" },
      { href: "/admin/cartelera", label: "Cartelera" },
      { href: "/admin/funciones", label: "Funciones" },
      { href: "/admin/ocupacion", label: "Sala" },
      { href: "/admin/invitaciones", label: "Invitaciones" },
    );
  }
  return links;
}
