import Link from "next/link";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getCurrentMember } from "@/lib/authz";

export default async function Home() {
  const member = await getCurrentMember();

  return (
    <div className="landing shell">
      <section className="hero">
        <p className="kicker">Videoclub privado · Solo socios</p>
        <h1>
          Rebobiná. Dale <em>play.</em>
        </h1>
        <p className="heroCopy">
          Una película por vez, catorce lugares y esa sensación de haber encontrado
          la última copia buena del videoclub.
        </p>

        {member ? (
          <div className="buttonRow">
            <Link className="primaryButton" href="/club">
              Entrar al club
            </Link>
            {member.role === "admin" ? (
              <Link className="secondaryButton" href="/admin/invitaciones">
                Administrar invitaciones
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="accessCard">
            <span className="accessNumber">SOCIO</span>
            <div>
              <h2>Mostrá tu carnet</h2>
              <p>Entrá con la misma cuenta de Google que usaste para hacerte miembro.</p>
            </div>
            <GoogleSignInButton />
          </div>
        )}
      </section>

      <aside className="poster" aria-label="Carátula VHS de la próxima función">
        <div className="posterFrame">
          <span>Pochoclo Home Video · Nº 001</span>
          <strong>PLAY</strong>
          <p>Estrenos de domingo. Edición limitada a catorce copias.</p>
        </div>
        <div className="posterShadow" />
      </aside>
    </div>
  );
}
