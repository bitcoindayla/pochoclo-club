import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCritiqueByToken, parseCritiqueCookie } from "@/lib/critiques";
import { CRITIQUE_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  const session = await getCritiqueByToken(token);
  if (!session) return NextResponse.json({ error: "No hay crítica." }, { status: 404 });
  const personId = parseCritiqueCookie(
    (await cookies()).get(CRITIQUE_COOKIE)?.value,
    session.screeningId,
  );
  const occupant = personId
    ? session.audience.find((row) => row.personId === personId && row.joined) ?? null
    : null;
  return NextResponse.json({
    status: session.status,
    movieTitle: session.movieTitle,
    movieYear: session.movieYear,
    movieDirector: session.movieDirector,
    occupantCount: session.occupantCount,
    joinedCount: session.joinedCount,
    roomAverage: session.roomAverage,
    me: occupant
      ? {
          personId: occupant.personId,
          name: occupant.name,
          joined: occupant.joined,
          submitted: occupant.submitted,
          average: occupant.average,
          scores: occupant.scores,
        }
      : null,
    names: session.audience.map((row) => ({
      personId: row.personId,
      name: row.name,
      joined: row.joined,
    })),
  });
}
