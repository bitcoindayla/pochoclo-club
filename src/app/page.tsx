import Link from "next/link";

import { Brand } from "@/components/brand";
import { DirectorMosaic } from "@/components/director-mosaic";
import { LandingRefresh } from "@/components/landing-refresh";
import { LandingAccess } from "@/components/landing-access";
import { LandingPhotoEditor } from "@/components/landing-photo-editor";
import { LandingWordmark } from "@/components/landing-wordmark";
import { SiteMenu } from "@/components/site-menu";
import { getCurrentMember } from "@/lib/authz";
import { getLandingVisual } from "@/lib/landing";
import { getLandingDirectors, hasLiveLandingBallot } from "@/lib/landing-directors";
import { getLandingStats } from "@/lib/landing-stats";
import { menuLinksFor } from "@/lib/nav";

export default async function Home() {
  const [member, visual, liveBallot] = await Promise.all([
    getCurrentMember(), getLandingVisual(), hasLiveLandingBallot(),
  ]);
  if (!liveBallot) {
    const [directors, stats] = await Promise.all([getLandingDirectors(), getLandingStats()]);
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
        <DirectorMosaic directors={directors} />
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
            Votá la próxima película.
            <br />
            Asegurá tu lugar.
          </h1>
          <p className="heroCopy">
            Entrá, votá la cartelera y reservá. Catorce lugares, casi todos los domingos.
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
