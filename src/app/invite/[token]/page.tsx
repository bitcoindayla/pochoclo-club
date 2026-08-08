import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getInvitationStatusFromToken } from "@/lib/invitations";

export const metadata: Metadata = { title: "Tu invitación" };

const unavailableCopy = {
  invalid: "Este enlace no corresponde a una invitación válida.",
  used: "Esta invitación ya fue utilizada.",
  revoked: "Esta invitación fue revocada por un administrador.",
  expired: "Esta invitación venció. Pedile una nueva a un administrador.",
} as const;

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const status = await getInvitationStatusFromToken(token);
  const available = status === "available";

  return (
    <div className="centeredPage shell narrowShell">
      <section className="ticket">
        <div className="ticketStub">
          <span>VIDEO CLUB</span>
          <b>90</b>
          <span>SOCIO NUEVO</span>
        </div>
        <div className="ticketBody">
          <p className="kicker">Carnet personal</p>
          <h1>{available ? "Tu membresía está lista." : "Este pase no está disponible."}</h1>
          <p>
            {available
              ? "Completá tu alta con Google. El enlace es personal, vence a los 30 días y puede usarse una sola vez."
              : unavailableCopy[status]}
          </p>
          {available ? (
            <GoogleSignInButton
              dark
              invitationToken={token}
              label="Aceptar con Google"
            />
          ) : (
            <Link className="inlineLink" href="/">
              Volver al inicio
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
