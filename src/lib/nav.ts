import "server-only";

import type { Member } from "@/lib/members";

export function menuLinksFor(member: Member | null) {
  if (!member) {
    return [{ href: "/", label: "Inicio" }];
  }

  const links = [
    { href: "/club#cartelera", label: "Selección de la película" },
    { href: "/club#sala", label: "Selección del asiento" },
    { href: "/historial", label: "Historial de votaciones" },
    { href: "/club#tickets", label: "Tickets" },
  ];
  if (member.role === "admin") {
    links.push(
      { href: "/", label: "Portada" },
      { href: "/admin/cartelera", label: "Cartelera" },
      { href: "/admin/funciones", label: "Funciones" },
      { href: "/admin/ocupacion", label: "Sala" },
      { href: "/admin/miembros", label: "Miembros" },
      { href: "/admin/critica", label: "Crítica" },
    );
  }
  return links;
}
