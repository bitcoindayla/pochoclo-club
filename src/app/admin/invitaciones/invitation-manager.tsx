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

export function InvitationManager() {
  const [state, action, pending] = useActionState(
    generateInvitationsAction,
    initialGenerateInvitationsState,
  );
  const [copied, setCopied] = useState<"all" | string | null>(null);

  async function copyLinks() {
    await navigator.clipboard.writeText(state.links.map((link) => link.url).join("\n"));
    setCopied("all");
    window.setTimeout(() => setCopied(null), 1800);
  }

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

  async function sendWhatsApp(link: GeneratedInvitationLink) {
    const text = invitationTicketShareText({
      url: link.url,
      expiresAt: new Date(link.expiresAt),
    });
    try {
      const response = await fetch(link.ticketPath);
      const blob = await response.blob();
      const file = new File([blob], `pochoclo-${link.serial}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: "Pochoclo Club" });
        return;
      }
    } catch {
      // WhatsApp web still gets the invite link; the ticket travels as the preview.
    }
    window.open(whatsappShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="generatorCard">
      <div>
        <p className="kicker">Nuevo lote</p>
        <h2>Generar invitaciones</h2>
        <p>Cada pase es individual, vence en 30 días y se usa una sola vez. Mandalo por WhatsApp con el ticket.</p>
      </div>

      <form action={action} className="generatorForm">
        <label htmlFor="count">Cantidad</label>
        <select defaultValue="1" id="count" name="count">
          {[1, 2, 3, 4, 5, 10, 15, 20].map((count) => (
            <option key={count} value={count}>{count}</option>
          ))}
        </select>
        <button className="primaryButton" disabled={pending} type="submit">
          {pending ? "Generando…" : "Generar lote"}
        </button>
      </form>

      {state.error ? <p className="formError" role="alert">{state.error}</p> : null}

      {state.links.length > 0 ? (
        <div className="freshLinks" aria-live="polite">
          <div className="freshLinksHeader">
            <div>
              <strong>{state.links.length} {state.links.length === 1 ? "pase listo" : "pases listos"}</strong>
              <span>Enviá el ticket por WhatsApp. El enlace no se puede recuperar después.</span>
            </div>
            <button className="copyButton" onClick={copyLinks} type="button">
              {copied === "all" ? "Copiados ✓" : "Copiar todos"}
            </button>
          </div>
          <ul className="invitePassList">
            {state.links.map((link) => (
              <li className="invitePass" key={link.id}>
                <img
                  alt={`Pase ${link.serial}`}
                  className="invitePassImage"
                  height={1200}
                  src={link.ticketPath}
                  width={720}
                />
                <div className="invitePassMeta">
                  <strong>{link.serial}</strong>
                  <span>vence {formatExpiry(link.expiresAt)}</span>
                </div>
                <div className="invitePassActions">
                  <button className="inviteWhatsApp" onClick={() => void sendWhatsApp(link)} type="button">
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
