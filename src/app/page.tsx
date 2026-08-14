import Link from "next/link";

import { LandingAccess } from "@/components/landing-access";
import { LandingPhotoEditor } from "@/components/landing-photo-editor";
import { SiteMenu } from "@/components/site-menu";
import { getCurrentMember } from "@/lib/authz";
import { getLandingVisual } from "@/lib/landing";
import { menuLinksFor } from "@/lib/nav";

export default async function Home() {
  const [member, visual] = await Promise.all([getCurrentMember(), getLandingVisual()]);

  return (
    <div className="landingStage">
      <header className="landingChrome">
        <div className="landingChromeSide">
          {member ? <SiteMenu links={menuLinksFor(member)} visual={visual} /> : null}
        </div>
        <span className="landingWordmark">
          Pochoclo <i>Club</i>
        </span>
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
          <picture>
            <source media="(max-width: 800px)" srcSet={visual.portraitUrl} />
            <img alt="" src={visual.landscapeUrl} />
          </picture>
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
