import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/session-actions";
import { requireAdmin } from "@/lib/authz";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";
import { listScreenings } from "@/lib/screenings";

import {
  CloseScreeningButton,
  CreateScreeningForm,
  OpenScreeningButton,
} from "./screening-manager";

export const metadata: Metadata = { title: "Funciones" };

const statusLabels = {
  draft: "Borrador",
  open: "Reservas abiertas",
  closed: "Cerrada",
};

function formatScreeningDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLUB_TIME_ZONE,
  }).format(date);
}

export default async function ScreeningsPage() {
  const admin = await requireAdmin();
  const screenings = await listScreenings();

  return (
    <div className="adminPage shell">
      <div className="dashboardHeader">
        <div>
          <Link className="backLink" href="/club">← Volver al club</Link>
          <p className="kicker">Panel administrativo</p>
          <h1>Funciones</h1>
          <p className="pageIntro">Sesión de {admin.name}</p>
          <Link className="backLink" href="/admin/cartelera">Ir a La cartelera →</Link>
        </div>
        <SignOutButton />
      </div>

      <section className="screeningCreator">
        <div>
          <p className="kicker">Próxima fecha</p>
          <h2>Crear una función</h2>
          <p>Primero guardala como borrador. Cuando esté lista, abrí las reservas.</p>
        </div>
        <CreateScreeningForm />
      </section>

      <section className="screeningHistory">
        <div className="sectionHeading">
          <div>
            <p className="kicker">Programación</p>
            <h2>Funciones creadas</h2>
          </div>
          <span>{screenings.length} en total</span>
        </div>

        {screenings.length === 0 ? (
          <p className="emptyList">Todavía no creaste ninguna función.</p>
        ) : (
          <div className="screeningList">
            {screenings.map((screening) => (
              <article className="screeningRow" key={screening.id}>
                <div>
                  <span className={`status status-${screening.status}`}>
                    {statusLabels[screening.status]}
                  </span>
                  <h3>{screening.title || "Función sin título"}</h3>
                  <p>{formatScreeningDate(screening.startsAt)}</p>
                  {screening.message ? <small>{screening.message}</small> : null}
                </div>
                {screening.status === "draft" ? (
                  <OpenScreeningButton screeningId={screening.id} />
                ) : screening.status === "open" ? (
                  <div className="compactActions">
                    <Link className="secondaryButton" href="/admin/ocupacion">Gestionar sala</Link>
                    <CloseScreeningButton screeningId={screening.id} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
