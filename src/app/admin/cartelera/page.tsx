import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/session-actions";
import { requireAdmin } from "@/lib/authz";
import { listActiveMembersForReservation } from "@/lib/members";
import {
  listMovieBallotExemptions,
  listMovieBallots,
} from "@/lib/movie-voting";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";
import { listScreenings } from "@/lib/screenings";

import {
  BallotForm,
  DraftBallotActions,
  ExemptionForm,
  OpenBallotActions,
  TieBreaker,
} from "./ballot-manager";

export const metadata: Metadata = { title: "La cartelera" };

const statusLabels = {
  draft: "Borrador",
  open: "Votación abierta",
  decision: "Empate por resolver",
  closed: "Ganadora elegida",
  canceled: "Cancelada",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLUB_TIME_ZONE,
  }).format(date);
}

export default async function MovieBallotsPage() {
  const admin = await requireAdmin();
  const [screenings, ballots, members] = await Promise.all([
    listScreenings(),
    listMovieBallots(),
    listActiveMembersForReservation(),
  ]);
  const exemptions = new Map(
    await Promise.all(
      ballots.map(async (ballot) => [
        ballot.id,
        await listMovieBallotExemptions(ballot.id),
      ] as const),
    ),
  );
  const ballotScreeningIds = new Set(ballots.map((ballot) => ballot.screeningId));
  const availableDrafts = screenings.filter(
    (screening) => screening.status === "draft" && !ballotScreeningIds.has(screening.id),
  );

  return (
    <div className="adminPage shell">
      <div className="dashboardHeader">
        <div>
          <Link className="backLink" href="/club">← Volver al club</Link>
          <p className="kicker">Panel administrativo</p>
          <h1>La cartelera</h1>
          <p className="pageIntro">Armá la votación de películas. Sesión de {admin.name}.</p>
          <AdminNav current="/admin/cartelera" />
        </div>
        <SignOutButton />
      </div>

      <section className="ballotCreator">
        <div>
          <p className="kicker">Nueva votación</p>
          <h2>Elegí entre 3 y 5 películas</h2>
          <p>
            Primero creá la fecha en Funciones. La votación debe cerrar antes de esa función.
          </p>
          <Link className="backLink" href="/admin/funciones">Ir a Funciones →</Link>
        </div>
        {availableDrafts.length ? (
          <BallotForm screenings={availableDrafts} />
        ) : (
          <p className="emptyList">
            No hay una función borrador libre. Creá una, o terminá la cartelera que ya tiene.
          </p>
        )}
      </section>

      <section className="screeningHistory ballotHistory">
        <div className="sectionHeading">
          <div>
            <p className="kicker">Historial</p>
            <h2>Votaciones</h2>
          </div>
          <span>{ballots.length} en total</span>
        </div>

        {ballots.length === 0 ? (
          <p className="emptyList">Todavía no creaste ninguna cartelera.</p>
        ) : (
          <div className="ballotList">
            {ballots.map((ballot) => {
              const screening = screenings.find((item) => item.id === ballot.screeningId);
              const winner = ballot.options.find((option) => option.id === ballot.winnerOptionId);
              const exemptMemberIds = (exemptions.get(ballot.id) ?? []).map(
                (exemption) => exemption.memberId,
              );
              return (
                <article className="ballotCard" key={ballot.id}>
                  <div className="ballotCardHeader">
                    <div>
                      <span className={`status status-${ballot.status}`}>
                        {statusLabels[ballot.status]}
                      </span>
                      <h3>{screening?.title || winner?.title || "Función sin título"}</h3>
                      <p>
                        Función: {screening ? formatDate(screening.startsAt) : "sin datos"}<br />
                        Cierre: {formatDate(ballot.closesAt)}
                      </p>
                    </div>
                    <div className="ballotStat">
                      <strong>{ballot.voterCount}</strong>
                      votantes
                    </div>
                  </div>

                  {ballot.status === "draft" ? (
                    <>
                      <details className="ballotEdit">
                        <summary>Editar películas y cierre</summary>
                        <BallotForm ballot={ballot} screenings={screenings} />
                      </details>
                      <DraftBallotActions ballot={ballot} />
                    </>
                  ) : (
                    <div className="adminBallotResults">
                      {ballot.options.map((movie) => (
                        <div
                          className={movie.id === ballot.winnerOptionId ? "adminResult winnerResult" : "adminResult"}
                          key={movie.id}
                        >
                          <div>
                            <strong>{movie.title}</strong>
                            <small>{movie.year} · {movie.director}</small>
                          </div>
                          <span>{ballot.counts[movie.id] ?? 0} votos</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {ballot.status === "open" ? <OpenBallotActions ballot={ballot} /> : null}
                  {ballot.status === "decision" ? <TieBreaker ballot={ballot} /> : null}
                  {["open", "decision", "closed"].includes(ballot.status) ? (
                    <ExemptionForm
                      ballot={ballot}
                      exemptMemberIds={exemptMemberIds}
                      members={members}
                    />
                  ) : null}
                  {winner ? (
                    <p className="winnerNotice">Ganadora: <strong>{winner.title}</strong></p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
