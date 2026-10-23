/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useState } from "react";

import { whatsappShareUrl } from "@/lib/essay-policy";
import { invitationTicketShareText } from "@/lib/invitation-ticket-policy";

import {
  generateInvitationsAction,
  type GeneratedInvitationLink,
  type GenerateInvitationsState,
} from "./actions";

const initialGenerateInvitationsState: GenerateInvitationsState = {
  error: null,
  links: [],
};

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Mendoza",
  }).format(new Date(value));
}

export function InvitationManager({ members }: { members: Array<{ id: string; name: string; email: string }> }) {
  const [state, action, pending] = useActionState(
    generateInvitationsAction,
    initialGenerateInvitationsState,
  );
  const [copied, setCopied] = useState<string | null>(null);

  async function copyLink(link: GeneratedInvitationLink) {
    await navigator.clipboard.writeText(link.url);
    setCopied(link.id);
    window.setTimeout(() => setCopied(null), 1800);
  }

  async function downloadPass(link: GeneratedInvitationLink) {
    const response = await fetch(link.ticketPath);
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `pochoclo-${link.serial}.png`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }

  function sendWhatsApp(link: GeneratedInvitationLink) {
    const text = invitationTicketShareText({
      url: link.url,
      expiresAt: new Date(link.expiresAt),
      inviterName: link.inviterName,
    });
    window.open(whatsappShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="generatorCard">
      <div>
        <p className="kicker">Nuevo pase</p>
        <h2>Generar invitación</h2>
        <p>El pase es de un miembro: vence en 30 días y pueden entrar varias personas. En el seguimiento queda quién invitó. WhatsApp abre directo, con el nombre en el mensaje y en el ticket.</p>
      </div>

      {members.length === 0 ? (
        <p>No hay miembros activos para generar un pase.</p>
      ) : (
        <form action={action} className="generatorForm">
          <label htmlFor="inviterMemberId">Quién invita</label>
          <select defaultValue="" id="inviterMemberId" name="inviterMemberId" required>
            <option value="" disabled>Elegí un miembro</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.name} · {member.email}</option>
            ))}
          </select>
          <button className="primaryButton" disabled={pending} type="submit">
            {pending ? "Generando…" : "Generar pase"}
          </button>
        </form>
      )}

      {state.error ? <p className="formError" role="alert">{state.error}</p> : null}

      {state.links.length > 0 ? (
        <div className="freshLinks" aria-live="polite">
          <div className="freshLinksHeader">
            <div>
              <strong>{state.links.length === 1 ? `Pase de ${state.links[0]?.inviterName}` : `${state.links.length} pases listos`}</strong>
              <span>WhatsApp abre con el mensaje y el enlace. El pase no se puede recuperar después.</span>
            </div>
          </div>
          <ul className="invitePassList">
            {state.links.map((link) => (
              <li className="invitePass" key={link.id}>
                <img
                  alt={`Invita ${link.inviterName}. Pase ${link.serial}`}
                  className="invitePassImage"
                  height={1200}
                  src={link.ticketPath}
                  width={720}
                />
                <div className="invitePassMeta">
                  <strong>Invita {link.inviterName}</strong>
                  <span>{link.serial} · vence {formatExpiry(link.expiresAt)}</span>
                </div>
                <div className="invitePassActions">
                  <button className="inviteWhatsApp" onClick={() => sendWhatsApp(link)} type="button">
                    WhatsApp
                  </button>
                  <button className="secondaryButton" onClick={() => void downloadPass(link)} type="button">
                    Descargar
                  </button>
                  <button className="copyButton" onClick={() => void copyLink(link)} type="button">
                    {copied === link.id ? "Copiado ✓" : "Copiar enlace"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
