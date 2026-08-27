import type { Metadata } from "next";

import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/session-actions";
import { requireMember } from "@/lib/authz";
import { listActiveMembersForReservation } from "@/lib/members";
import {
  getLatestMovieWinner,
  getMemberMovieBallot,
} from "@/lib/movie-voting";
import { listMemberReputations } from "@/lib/reputation";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";
import { getOpenScreeningForMember } from "@/lib/screenings";

import { ReservationTickets } from "./reservation-tickets";
import { RoomRoster } from "./room-roster";
import { SeatMap } from "./seat-map";
import { LatestWinner, MovieBallotPanel } from "./movie-ballot";

export const metadata: Metadata = { title: "El club" };

export default async function ClubPage() {
  const member = await requireMember();
  let screening = await getOpenScreeningForMember(member.id);
  const ballot = screening
    ? await getMemberMovieBallot(screening.id, member.id)
    : null;
  if (screening && ballot) {
    screening = await getOpenScreeningForMember(member.id);
  }
  const latestWinner = await getLatestMovieWinner();
  const reputationList =
    screening && (!ballot || ballot.canAccessSeats)
      ? await listMemberReputations()
      : new Map();
  const reputations = Object.fromEntries(reputationList);
  const guestCandidates =
    screening &&
    screening.status === "open" &&
    !screening.guestReservation &&
    !screening.guestWaitlistEntry
      ? (await listActiveMembersForReservation()).filter(
          (candidate) =>
            candidate.id !== member.id &&
            !screening.occupancy.some((place) => place.memberId === candidate.id) &&
            !screening.waitlist.some((entry) => entry.memberId === candidate.id),
        )
      : [];
  const firstName = member.name.split(" ")[0];

  const screeningDate = screening
    ? new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: CLUB_TIME_ZONE,
      }).format(screening.startsAt)
    : null;
  const ticketDate = screening
    ? new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: CLUB_TIME_ZONE,
      }).format(screening.startsAt)
    : "";
  const ticketTime = screening
    ? new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: CLUB_TIME_ZONE,
      }).format(screening.startsAt)
    : "";

  return (
    <div className={ballot ? "clubPage hasCinematic" : "clubPage"}>
      {latestWinner && !ballot ? <LatestWinner movie={latestWinner.movie} /> : null}
      {ballot ? (
        <MovieBallotPanel ballot={ballot} hasSeat={Boolean(screening?.ownPlaceCode)} />
      ) : null}

      <div className="dashboard shell">
        <div className="dashboardHeader">
          <div>
            <p className="kicker">Membresía activa</p>
            <h1>Hola, {firstName}.</h1>
          </div>
          <SignOutButton />
        </div>

        {screening ? (
          <section className="screeningFeature" id="sala">
            <div className="screeningIntro">
              <div>
                <p className="kicker">
                  {screening.status === "closed" ? "Función cerrada · solo lectura" : "Reservas abiertas"}
                </p>
                <h2>{screening.title || "Próxima función"}</h2>
                <p className="screeningDate">{screeningDate}</p>
                {screening.message ? <p className="screeningMessage">{screening.message}</p> : null}
              </div>
              <span className="availabilityCount">
                <strong>{14 - screening.occupancy.length - screening.blockedPlaceCodes.length}</strong>
                lugares libres
              </span>
            </div>
            {!ballot || ballot.canAccessSeats ? (
              <>
                <SeatMap
                  blockedPlaceCodes={screening.blockedPlaceCodes}
                  guestCandidates={guestCandidates}
                  guestReservation={screening.guestReservation}
                  guestWaitlistEntry={screening.guestWaitlistEntry}
                  occupancy={screening.occupancy}
                  ownPlaceCode={screening.ownPlaceCode}
                  ownReservationKind={screening.ownReservationKind}
                  ownWaitlistEntry={screening.ownWaitlistEntry}
                  readOnly={screening.status === "closed"}
                  screeningId={screening.id}
                  waitlist={screening.waitlist}
                />
                <RoomRoster occupancy={screening.occupancy} reputations={reputations} />
              </>
            ) : (
              <div className="seatGate">
                <strong>El mapa todavía está bloqueado.</strong>
                <p>
                  {ballot.status === "open"
                    ? "Guardá tu voto arriba y se habilita enseguida."
                    : "La votación cerró y no registramos tu voto. Pedile una excepción al administrador."}
                </p>
              </div>
            )}
          </section>
        ) : null}

        {screening?.ownPlaceCode ? (
          <ReservationTickets
            dateLabel={ticketDate}
            guestName={screening.guestReservation?.memberName ?? null}
            guestPlaceCode={screening.guestReservation?.placeCode ?? null}
            memberName={member.name}
            movies={ballot?.options ?? []}
            ownPlaceCode={screening.ownPlaceCode}
            screeningId={screening.id}
            screeningTitle={screening.title || "Próxima función"}
            timeLabel={ticketTime}
          />
        ) : null}

        {screening ? null : (
          <section className="emptyFeature">
            <span className="featureDate">PRÓX.</span>
            <div>
              <h2>Todavía no hay una función abierta.</h2>
              <p>Cuando un administrador abra las reservas, el mapa va a aparecer acá.</p>
            </div>
          </section>
        )}

        {member.role === "admin" ? (
          <section className="adminCallout">
            <div>
              <p className="kicker">Administración</p>
              <h2>Prepará la próxima ronda.</h2>
            </div>
            <AdminNav />
          </section>
        ) : null}
      </div>
    </div>
  );
}
