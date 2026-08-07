import Link from "next/link";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getCurrentMember } from "@/lib/authz";

export default async function Home() {
  const member = await getCurrentMember();

  return (
    <div className="landing shell">
      <section className="hero">
        <p className="kicker">Club de cine privado</p>
        <h1>
          La próxima película empieza <em>acá.</em>
        </h1>
        <p className="heroCopy">
          Un domingo, una sala chica y una buena razón para mirar cine con otras
          personas.
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
            <span className="accessNumber">01</span>
            <div>
              <h2>Ya soy miembro</h2>
              <p>Ingresá con la misma cuenta de Google que usaste al aceptar tu invitación.</p>
            </div>
            <GoogleSignInButton />
          </div>
        )}
      </section>

      <aside className="poster" aria-label="Próxima función, todavía sin programar">
        <div className="posterFrame">
          <span>Próximamente</span>
          <strong>DOM</strong>
          <p>La próxima función aparece acá cuando el club abre las reservas.</p>
        </div>
        <div className="posterShadow" />
      </aside>
    </div>
  );
}
