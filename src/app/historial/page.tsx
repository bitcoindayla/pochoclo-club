import type { Metadata } from "next";
import Link from "next/link";

import { requireMember } from "@/lib/authz";
import { listFilmHistory } from "@/lib/critiques";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";

export const metadata: Metadata = { title: "Historial" };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: CLUB_TIME_ZONE,
  }).format(date);
}

export default async function HistoryPage() {
  await requireMember();
  const history = await listFilmHistory();

  return (
    <div className="adminPage shell">
      <p className="kicker">El archivo</p>
      <h1>Lo que vimos</h1>
      <p className="pageIntro">Fecha, título, dirección, año y el puntaje de la sala.</p>

      {history.length === 0 ? (
        <p className="emptyList">Todavía no hay películas en el historial.</p>
      ) : (
        <table className="invitationTable">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Película</th>
              <th>Puntaje</th>
            </tr>
          </thead>
          <tbody>
            {history.map((film) => (
              <tr key={film.id}>
                <td data-label="Fecha">{formatDate(film.watchedAt)}</td>
                <td data-label="Película">
                  <strong>{film.title}</strong>
                  <small>
                    {film.year} · {film.director}
                  </small>
                </td>
                <td data-label="Puntaje">
                  <strong>{film.score.toFixed(1)}</strong>
                  {film.voterCount > 0 ? <small>{film.voterCount} votos</small> : <small>archivo</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p>
        <Link className="inlineLink" href="/club">
          Volver al club
        </Link>
      </p>
    </div>
  );
}
