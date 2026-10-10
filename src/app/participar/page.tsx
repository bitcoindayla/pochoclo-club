import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentMember } from "@/lib/authz";
import { getLandingDirectors } from "@/lib/landing-directors";

import { TasteGate } from "./taste-gate";

export const metadata: Metadata = {
  title: "Quiero participar",
  description: "Marcá diez pelis del archivo y, si coincidís, te abrimos un lugar en Pochoclo Club.",
};

export default async function ParticiparPage() {
  const member = await getCurrentMember();
  if (member) redirect("/club");
  const directors = await getLandingDirectors();

  return (
    <div className="directorLanding isTasteGate">
      <TasteGate directors={directors} />
    </div>
  );
}
