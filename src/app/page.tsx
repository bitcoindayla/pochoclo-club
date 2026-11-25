import Link from "next/link";

import { Brand } from "@/components/brand";
import { LandingRefresh } from "@/components/landing-refresh";
import { LandingAccess } from "@/components/landing-access";
import { LandingPhotoEditor } from "@/components/landing-photo-editor";
import { LandingWordmark } from "@/components/landing-wordmark";
import { FestivalMarks } from "@/components/festival-marks";
import { SalaList } from "@/components/sala-list";
import { SiteMenu } from "@/components/site-menu";
import { getCurrentMember } from "@/lib/authz";
import { getLandingVisual } from "@/lib/landing";
import { hasLiveLandingBallot, hasOpenLandingScreening } from "@/lib/landing-directors";
import { getLandingStats } from "@/lib/landing-stats";
import { getSalaListState } from "@/lib/sala-list";
import { menuLinksFor } from "@/lib/nav";

export default async function Home() {
  const [member, visual, liveBallot, liveScreening] = await Promise.all([
    getCurrentMember(), getLandingVisual(), hasLiveLandingBallot(), hasOpenLandingScreening(),
  ]);
  if (!liveBallot && !liveScreening) {
    const [stats, sala] = await Promise.all([getLandingStats(), getSalaListState()]);
    return (
      <div className="directorLanding">
        <LandingRefresh />
        <header className="directorHeader">
          <div className="directorHeaderLeft">
            {member ? <SiteMenu links={menuLinksFor(member)} visual={visual} /> : (
              <span className="directorHeaderCaption">Otra mirada, algo nos queda.<span>{stats.functionsCount.toLocaleString("es-AR")} FUNCIONES | {stats.people.toLocaleString("es-AR")} ESPECTADORES</span></span>
            )}
          </div>
          <Brand />
          <div className="directorHeaderAccess">
            {member ? <Link className="landingCta landingCtaMember" href="/club">Entrar al club</Link> : <LandingAccess compact />}
          </div>
        </header>
        <SalaList counts={sala.counts} votedIds={sala.votedIds} />
      </div>
    );
  }
  const filmCredit = visual?.movie
    ? `${visual.movie.title} (${visual.movie.year}) | Dirección: ${visual.movie.director}`
    : "";

  return (
    <div className="landingStage">
      <LandingRefresh />
      <header className="landingChrome">
        <div className="landingChromeSide">
          {member ? <SiteMenu links={menuLinksFor(member)} visual={visual} /> : null}
        </div>
        <LandingWordmark key={visual?.version ?? "empty"} accent={visual?.accent ?? null} imageUrl={visual?.landscapeUrl} />
      </header>
      <section className="landingPanel">
        <div className="landingCopy">
          <p className="kicker">El domingo es para cine</p>
          <h1>
            {liveBallot ? (
              <>
                Votá la próxima película.
                <br />
                Asegurá tu lugar.
              </>
            ) : (
              <>
                {visual?.movie?.title ? `Este domingo, ${visual.movie.title}.` : "Este domingo hay película."}
                <br />
                Asegurá tu lugar.
              </>
            )}
          </h1>
          <p className="heroCopy">
            {liveBallot
              ? "Entrá, votá la cartelera y reservá. Catorce lugares, casi todos los domingos."
              : "Entrá y reservá tu asiento. Catorce lugares, una sola propuesta."}
          </p>
          <p className="landingNote">
            Somos el primer club debate de cine de la Argentina, con sala privada.
          </p>
          <div className="landingActions">
            {member ? (
              <Link className="primaryButton" href="/club">
                Entrar al club
              </Link>
            ) : (
              <LandingAccess />
            )}
            {member?.role === "admin" ? <LandingPhotoEditor visual={visual} /> : null}
          </div>
        </div>
      </section>

      <aside className="landingStill" aria-hidden={visual ? undefined : true}>
        {visual ? (
          <>
            <picture>
              <img alt={visual.movie ? `Fotograma de ${visual.movie.title}` : ""} src={visual.landscapeUrl} />
            </picture>
            {visual.movie ? (
              <div className="landingFilmCredit">
                <p title={filmCredit}>{filmCredit}</p>
                <FestivalMarks marks={visual.movie.awards} caption />
              </div>
            ) : null}
          </>
        ) : (
          <div className="landingFallback">
            <span>Próximamente</span>
            <strong>DOM</strong>
          </div>
        )}
      </aside>
    </div>
  );
}
