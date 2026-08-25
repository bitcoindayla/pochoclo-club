import type { Metadata } from "next";
import Link from "next/link";

import { requireMember } from "@/lib/authz";
import { roundScore } from "@/lib/critique-policy";
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
  const average =
    history.length > 0
      ? roundScore(history.reduce((sum, film) => sum + film.score, 0) / history.length)
      : null;
  const peak = history.reduce<(typeof history)[number] | null>(
    (best, film) => (best && best.score >= film.score ? best : film),
    null,
  );

  return (
    <div className="adminPage shell">
      <div className="historyHead">
        <div>
          <p className="kicker">El archivo</p>
          <h1>Lo que vimos</h1>
          <p className="pageIntro">Fecha, título, dirección, año y el puntaje de la sala.</p>
        </div>
        {history.length > 0 ? (
          <dl className="historyStats">
            <div>
              <dt>Películas</dt>
              <dd>{history.length}</dd>
            </div>
            <div>
              <dt>Promedio</dt>
              <dd>{average?.toFixed(1)}</dd>
            </div>
            {peak ? (
              <div>
                <dt>Techo</dt>
                <dd>{peak.score.toFixed(1)}</dd>
                <small>{peak.title}</small>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

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
