import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ScreeningPrelude } from "@/components/screening-prelude";
import { requireAdmin } from "@/lib/authz";
import { critiqueQrSvg } from "@/lib/critique-qr";
import { getCritiqueSession } from "@/lib/critiques";
import { getMovieBallot } from "@/lib/movie-voting";
import { preludeFilmsFrom } from "@/lib/screening-prelude-policy";
import { getOpenScreeningForMember } from "@/lib/screenings";

import { CritiqueBoard } from "../board";

export const metadata: Metadata = { title: "Proyección" };

async function publicOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  if (!host) return "https://pochoclo.club";
  return `${proto}://${host}`;
}

export default async function CritiqueProjectionPage() {
  const admin = await requireAdmin();
  const screening = await getOpenScreeningForMember(admin.id);
  if (!screening) redirect("/admin/critica");
  const session = await getCritiqueSession(screening.id);

  if (session) {
    const scoreUrl = `${await publicOrigin()}/c/${session.token}`;
    const qrSvg = await critiqueQrSvg(scoreUrl);
    return (
      <CritiqueBoard
        initialSession={session}
        projection
        qrSvg={qrSvg}
        scoreUrl={scoreUrl}
      />
    );
  }

  const ballot = await getMovieBallot(screening.id);
  const films = preludeFilmsFrom({
    screeningId: screening.id,
    movie: screening.movie,
    ballot,
  });
  if (films.length === 0) redirect("/admin/critica");

  return (
    <ScreeningPrelude
      films={films}
      localTime={screening.localTime}
      nightTitle={screening.title}
      startsAt={screening.startsAt.toISOString()}
    />
  );
}
