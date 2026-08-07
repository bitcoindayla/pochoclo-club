import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Pochoclo Club, inicio">
      <span className="brandMark" aria-hidden="true">
        P
      </span>
      <span>
        Pochoclo <i>Club</i>
      </span>
    </Link>
  );
}
