import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/session-actions";
import { requireAdmin } from "@/lib/authz";
import { getCritiqueSession, listFilmHistory } from "@/lib/critiques";
import { getOpenScreeningForMember } from "@/lib/screenings";

import { LegacyFilmForm, OpenCritiqueForm } from "./forms";

export const metadata: Metadata = { title: "La crítica" };

export default async function CritiqueAdminPage() {
  const admin = await requireAdmin();
  const screening = await getOpenScreeningForMember(admin.id);
  const session = screening ? await getCritiqueSession(screening.id) : null;
  const history = await listFilmHistory();
  const movie = screening?.movie;

  return (
    <div className="adminPage shell">
      <div className="dashboardHeader">
        <div>
          <Link className="backLink" href="/club">
            ← Volver al club
          </Link>
          <p className="kicker">Panel administrativo</p>
          <h1>La crítica</h1>
          <p className="pageIntro">QR en la sala. Cinco notas. Historial.</p>
          <AdminNav current="/admin/critica" />
        </div>
        <SignOutButton />
      </div>

      <section className="screeningCreator">
        <div>
          <p className="kicker">Esta noche</p>
          <h2>Pantalla de la sala</h2>
          <p>
            Abrí la crítica, proyectá el QR y esperá a que todos escaneen. Después empezás la
            puntuación.
          </p>
        </div>
        {screening ? (
          session ? (
            <div className="accessCard">
              <h2>{session.status === "closed" ? "Publicada" : "En curso"}</h2>
              <p>
                {session.movieTitle} · {session.joinedCount}/{session.occupantCount} en la sala
              </p>
              <Link className="primaryButton" href="/admin/critica/sala">
                Abrir pantalla
              </Link>
            </div>
          ) : screening.occupancy.length === 0 ? (
            <p>No hay nadie sentado todavía.</p>
          ) : (
            <OpenCritiqueForm
              director={movie?.director ?? ""}
              occupancy={screening.occupancy.length}
              screeningId={screening.id}
              title={movie?.title ?? screening.title ?? ""}
              year={movie?.year ? String(movie.year) : ""}
            />
          )
        ) : (
          <p>No hay una función abierta o cerrada para criticar.</p>
        )}
      </section>

      <section className="invitationHistory">
        <div className="sectionHeading">
          <div>
            <p className="kicker">Archivo</p>
            <h2>Cargar una peli ya vista</h2>
          </div>
          <span>{history.length} en el historial</span>
        </div>
        <p className="pageIntro">Para las 44 anteriores: un solo puntaje del 0 al 10, sin categorías.</p>
        <LegacyFilmForm />
      </section>
    </div>
  );
}
