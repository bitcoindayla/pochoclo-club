import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/session-actions";
import { requireMember } from "@/lib/authz";
import { listActiveMembersForReservation } from "@/lib/members";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";
import { getOpenScreeningForMember } from "@/lib/screenings";

import { SeatMap } from "./seat-map";

export const metadata: Metadata = { title: "El club" };

export default async function ClubPage() {
  const member = await requireMember();
  const screening = await getOpenScreeningForMember(member.id);
  const hasPersonalBooking =
    screening?.ownReservationKind === "self" ||
    screening?.ownWaitlistEntry?.kind === "self";
  const guestCandidates =
    screening &&
    screening.status === "open" &&
    hasPersonalBooking &&
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

  return (
    <div className="dashboard shell">
      <div className="dashboardHeader">
        <div>
          <p className="kicker">Carnet habilitado</p>
          <h1>Hola, {firstName}.</h1>
        </div>
        <SignOutButton />
      </div>

      {screening ? (
        <section className="screeningFeature">
          <div className="screeningIntro">
            <div>
              <p className="kicker">
                {screening.status === "closed" ? "Cinta archivada · solo lectura" : "En alquiler · Reservas abiertas"}
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
        </section>
      ) : (
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
            <p className="kicker">Detrás del mostrador</p>
            <h2>Prepará el próximo estreno.</h2>
          </div>
          <div className="buttonRow">
            <Link className="secondaryButton lightButton" href="/admin/ocupacion">
              Gestionar sala
            </Link>
            <Link className="secondaryButton lightButton" href="/admin/funciones">
              Gestionar funciones
            </Link>
            <Link className="secondaryButton lightButton" href="/admin/invitaciones">
              Invitaciones
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
