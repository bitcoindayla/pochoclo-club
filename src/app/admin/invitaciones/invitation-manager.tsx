"use client";

import { useActionState, useState } from "react";

import {
  generateInvitationsAction,
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
  const [copied, setCopied] = useState(false);

  async function copyLinks() {
    await navigator.clipboard.writeText(state.links.map((link) => link.url).join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="generatorCard">
      <div>
        <p className="kicker">Nuevo lote</p>
        <h2>Generar invitaciones</h2>
        <p>Cada enlace es individual, vence en 30 días y desaparece después de usarlo.</p>
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
              <strong>{state.links.length} enlaces listos</strong>
              <span>Copialos ahora: por seguridad, no se pueden recuperar.</span>
            </div>
            <button className="copyButton" onClick={copyLinks} type="button">
              {copied ? "Copiados ✓" : "Copiar todos"}
            </button>
          </div>
          <ol>
            {state.links.map((link) => (
              <li key={link.id}>
                <code>{link.url}</code>
                <span>vence {formatExpiry(link.expiresAt)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
