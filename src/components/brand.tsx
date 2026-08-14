import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Pochoclo Club, inicio">
      Pochoclo <i>Club</i>
    </Link>
  );
}
