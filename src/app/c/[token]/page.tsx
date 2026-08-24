import type { Metadata } from "next";
import { cookies } from "next/headers";

import { getCritiqueByToken, parseCritiqueCookie } from "@/lib/critiques";
import { CRITIQUE_COOKIE } from "@/lib/session";

import { CritiquePhone } from "./phone";

export const metadata: Metadata = { title: "La crítica" };

export default async function CritiquePhonePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getCritiqueByToken(token);

  if (!session) {
    return (
      <div className="centeredPage shell narrowShell">
        <section className="messageCard">
          <p className="kicker">La crítica</p>
          <h1>Este QR ya no está activo.</h1>
          <p>Pedile al anfitrión que vuelva a abrir la puntuación en la sala.</p>
        </section>
      </div>
    );
  }

  const personId = parseCritiqueCookie((await cookies()).get(CRITIQUE_COOKIE)?.value, session.screeningId);
  const me = personId ? session.audience.find((row) => row.personId === personId) ?? null : null;

  return (
    <CritiquePhone
      token={token}
      initialData={{
        status: session.status,
        movieTitle: session.movieTitle,
        movieYear: session.movieYear,
        movieDirector: session.movieDirector,
        occupantCount: session.occupantCount,
        joinedCount: session.joinedCount,
        roomAverage: session.roomAverage,
        me,
        names: session.audience.map((row) => ({
          personId: row.personId,
          name: row.name,
          joined: row.joined,
        })),
      }}
    />
  );
}
