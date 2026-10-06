import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/session-actions";
import { requireAdmin } from "@/lib/authz";
import {
  getCritiqueSession,
  listFilmHistory,
  listScreeningOccupants,
} from "@/lib/critiques";
import { getMovieBallot } from "@/lib/movie-voting";
import { getOpenScreeningForMember } from "@/lib/screenings";
import { getRecommendationRound } from "@/lib/recommendations";

import { EssayForm, LegacyFilmForm, OccupancyScoreForm, OpenCritiqueForm } from "./forms";
import { RecommendationEditor } from "./recommendation-editor";

export const metadata: Metadata = { title: "La crítica" };

export default async function CritiqueAdminPage() {
  const admin = await requireAdmin();
  const screening = await getOpenScreeningForMember(admin.id);
  const session = screening ? await getCritiqueSession(screening.id) : null;
  const recommendations = screening
    ? session?.recommendations ?? await getRecommendationRound(screening.id)
    : null;
  const [history, occupants, ballot] = await Promise.all([
    listFilmHistory(),
    screening ? listScreeningOccupants(screening.id) : Promise.resolve([]),
    screening ? getMovieBallot(screening.id) : Promise.resolve(null),
  ]);
  const winner = ballot?.winnerOptionId
    ? ballot.options.find((option) => option.id === ballot.winnerOptionId) ?? null
    : null;
  const movie = screening?.movie ?? (winner
    ? { title: winner.title, year: winner.year, director: winner.director }
    : null);
  const alreadyPublished = Boolean(
    screening && history.some((film) => film.screeningId === screening.id),
  );
  const canScore =
    Boolean(screening) &&
    occupants.length > 0 &&
    !alreadyPublished &&
    session?.status !== "lobby" &&
    session?.status !== "scoring" &&
    session?.status !== "closed";

  return (
    <div className="adminPage shell">
      <div className="dashboardHeader">
        <div>
          <Link className="backLink" href="/club">
            ← Volver al club
          </Link>
          <p className="kicker">Panel administrativo</p>
          <h1>La crítica</h1>
          <p className="pageIntro">
            Antes de Stremio, la tele muestra el timer y las películas en carrera. Después de los
            créditos, la crítica: puntuación, debate y Pochoclo Recomienda.
          </p>
          <AdminNav current="/admin/critica" />
        </div>
        <SignOutButton />
      </div>

      <section className="screeningCreator">
        <div>
          <p className="kicker">Esta noche</p>
          <h2>Pantalla de la sala</h2>
          <p>
            Prendé la pantalla con el timer. Cuando terminen los títulos, abrí la crítica. Si alguien
            no trajo el teléfono, otro de la sala escanea y elige su nombre.
          </p>
        </div>
        {screening ? (
          session ? (
            <div className="accessCard">
              <h2>{session.status === "closed" ? "Publicada" : "En curso"}</h2>
              <p>
                {session.movieTitle} · {session.joinedCount}/{session.occupantCount} en la sala
              </p>
              <div className="buttonRow">
                <Link className="primaryButton" href="/admin/critica/sala">
                  Control
                </Link>
                <Link className="secondaryButton" href="/admin/critica/proyeccion" target="_blank">
                  Proyectar
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="accessCard">
                <h2>{movie?.title ?? screening.title ?? "Esta noche"}</h2>
                <p>
                  {screening.occupancy.length} en la sala · arranca a las {screening.localTime}
                </p>
                <div className="buttonRow">
                  <Link className="primaryButton" href="/admin/critica/proyeccion" target="_blank">
                    Pantalla de la sala
                  </Link>
                </div>
              </div>
              {screening.occupancy.length === 0 ? (
                <p>No hay nadie sentado todavía.</p>
              ) : (
                <OpenCritiqueForm
                  director={movie?.director ?? ""}
                  occupancy={screening.occupancy.length}
                  screeningId={screening.id}
                  title={movie?.title ?? ""}
                  year={movie?.year ? String(movie.year) : ""}
                />
              )}
            </>
          )
        ) : (
          <p>No hay una función abierta o cerrada para criticar.</p>
        )}
      </section>

      {screening && occupants.length > 0 && !session ? (
        <section className="invitationHistory">
          <div className="sectionHeading">
            <div>
              <p className="kicker">Esta función</p>
              <h2>Notas por persona</h2>
            </div>
            <span>{occupants.length} en la sala</span>
          </div>
          {canScore && !alreadyPublished ? (
            <OccupancyScoreForm
              director={movie?.director ?? ""}
              occupants={occupants}
              screeningId={screening.id}
              title={movie?.title ?? ""}
              year={movie?.year ? String(movie.year) : ""}
            />
          ) : (
            <p className="pageIntro">
              {alreadyPublished
                ? "Esta función ya tiene puntaje publicado."
                : "Cuando termine la película, cargá acá las cinco notas de cada presente."}
            </p>
          )}
        </section>
      ) : null}

      {screening ? (
        <div id="recomienda">
          <RecommendationEditor screeningId={screening.id} round={recommendations} />
        </div>
      ) : null}

      <section className="invitationHistory">
        <div className="sectionHeading">
          <div>
            <p className="kicker">Archivo</p>
            <h2>Reseña y fotograma</h2>
          </div>
          <span>{history.filter((film) => film.essay).length} con nota</span>
        </div>
        <p className="pageIntro">
          El análisis que mandamos por WhatsApp queda en la infografía de directores, con la foto de
          la escena y el puntaje de la sala.
        </p>
        {history.length > 0 ? <EssayForm films={history} /> : <p>Primero cargá una película al historial.</p>}
      </section>

      <section className="invitationHistory">
        <div className="sectionHeading">
          <div>
            <p className="kicker">Archivo</p>
            <h2>Cargar una peli ya vista</h2>
          </div>
          <span>{history.length} en el historial</span>
        </div>
        <p className="pageIntro">Para las anteriores al domingo: un solo puntaje del 0 al 10, sin categorías.</p>
        <LegacyFilmForm />
      </section>
    </div>
  );
}
