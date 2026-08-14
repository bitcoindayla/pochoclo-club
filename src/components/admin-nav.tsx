import Link from "next/link";

const links = [
  { href: "/", label: "Portada" },
  { href: "/admin/ocupacion", label: "Sala" },
  { href: "/admin/funciones", label: "Funciones" },
  { href: "/admin/cartelera", label: "Cartelera" },
  { href: "/admin/invitaciones", label: "Invitaciones" },
] as const;

export function AdminNav({ current }: { current?: string } = {}) {
  return (
    <nav className="adminNav" aria-label="Administración">
      {links.map((link) => (
        <Link
          aria-current={current === link.href ? "page" : undefined}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
