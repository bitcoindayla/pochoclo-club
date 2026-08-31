import Link from "next/link";

const links = [
  { href: "/club#cartelera", label: "Selección de la película" },
  { href: "/club#sala", label: "Selección del asiento" },
  { href: "/historial", label: "Historial de votaciones" },
  { href: "/club#tickets", label: "Tickets" },
] as const;

export function ClubNav({
  current,
  variant = "page",
}: {
  current?: (typeof links)[number]["href"];
  variant?: "page" | "cinematic";
}) {
  return (
    <nav
      aria-label="El club"
      className={variant === "cinematic" ? "clubNav cinematicClubNav" : "clubNav"}
    >
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
