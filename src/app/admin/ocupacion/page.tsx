import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/session-actions";
import { requireAdmin } from "@/lib/authz";
import { ALL_PLACE_CODES, FLOOR_PLACES, ROOM_ROWS, type PlaceCode } from "@/lib/room";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";
import { getOpenScreeningForMember } from "@/lib/screenings";

import { OccupancyManager } from "./occupancy-manager";
import { CloseScreeningButton } from "../funciones/screening-manager";

export const metadata: Metadata = { title: "Ocupación de la sala" };

const placeNames = Object.fromEntries(
  [...ROOM_ROWS.flat(), ...FLOOR_PLACES].map((place) => [place.code, place.name]),
) as Record<PlaceCode, string>;

export default async function OccupancyPage() {
  const admin = await requireAdmin();
  const screening = await getOpenScreeningForMember(admin.id);
  const date = screening
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
    <div className="adminPage shell">
      <div className="dashboardHeader">
        <div>
          <Link className="backLink" href="/club">← Volver al club</Link>
          <p className="kicker">Panel administrativo</p>
          <h1>Ocupación</h1>
          <p className="pageIntro">Sesión de {admin.name}</p>
        </div>
        <SignOutButton />
      </div>

      {screening ? (
        <>
          <section className="occupancySummary">
            <div>
              <p className="kicker">
                {screening.status === "closed" ? "Función cerrada · solo lectura" : "Función abierta"}
              </p>
              <h2>{screening.title || "Próxima función"}</h2>
              <p>{date}</p>
            </div>
            <div className="occupancyStats">
              <span><strong>{screening.occupancy.length}</strong> ocupados</span>
              <span><strong>{screening.blockedPlaceCodes.length}</strong> bloqueados</span>
              <span><strong>{ALL_PLACE_CODES.length - screening.occupancy.length - screening.blockedPlaceCodes.length}</strong> libres</span>
              <span><strong>{screening.waitlist.length}</strong> en espera</span>
            </div>
            {screening.status === "open" ? <CloseScreeningButton screeningId={screening.id} /> : null}
          </section>
          <OccupancyManager
            blockedPlaceCodes={screening.blockedPlaceCodes}
            occupancy={screening.occupancy}
            placeNames={placeNames}
            readOnly={screening.status === "closed"}
            screeningId={screening.id}
            waitlist={screening.waitlist}
          />
        </>
      ) : (
        <section className="emptyFeature">
          <div>
            <h2>No hay una función abierta.</h2>
            <p>Creá una función y abrí sus reservas para poder administrar la sala.</p>
          </div>
          <Link className="secondaryButton" href="/admin/funciones">Ir a funciones</Link>
        </section>
      )}
    </div>
  );
}
