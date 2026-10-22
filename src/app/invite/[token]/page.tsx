/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import {
  INVITE_TICKET_HEIGHT,
  INVITE_TICKET_WIDTH,
  invitationTicketPath,
} from "@/lib/invitation-ticket-policy";
import { getInvitationTicketPayload } from "@/lib/invitations";

const unavailableCopy = {
  invalid: "Este enlace no corresponde a una invitación válida.",
  used: "Esta invitación ya fue utilizada.",
  revoked: "Esta invitación fue revocada por un administrador.",
  expired: "Esta invitación venció. Pedile una nueva a un administrador.",
} as const;

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const invitation = await getInvitationTicketPayload(token);
  if (!invitation) return { title: "Tu invitación" };

  const image = {
    url: invitationTicketPath(token),
    width: INVITE_TICKET_WIDTH,
    height: INVITE_TICKET_HEIGHT,
    alt: "Pase de invitación Pochoclo Club",
    type: "image/png",
  };

  return {
    title: "Tu invitación",
    description: "Hay un lugar para vos en Pochoclo Club. Cine por invitación, sala privada en Mendoza.",
    openGraph: {
      title: "Pochoclo Club — tu pase",
      description: "Cine por invitación, sala privada en Mendoza.",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: "Pochoclo Club — tu pase",
      images: [image.url],
    },
  };
}

export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;
  const invitation = await getInvitationTicketPayload(token);
  const status = invitation?.status ?? "invalid";
  const available = status === "available";

  return (
    <div className="centeredPage shell narrowShell">
      <section className="ticket">
        <div className="ticketBody">
          {invitation ? (
            <img
              alt="Pase de invitación Pochoclo Club"
              className="inviteTicketPreview"
              height={INVITE_TICKET_HEIGHT}
              src={invitationTicketPath(token)}
              width={INVITE_TICKET_WIDTH}
            />
          ) : null}
          <p className="kicker">Invitación personal</p>
          <h1>{available ? "Hay un lugar para vos." : "Este pase no está disponible."}</h1>
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
