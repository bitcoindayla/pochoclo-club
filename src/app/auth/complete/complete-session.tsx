"use client";

import { useEffect, useState } from "react";

import { completeSessionFromIdToken, googleAuthMessage } from "@/lib/google-auth";

export function CompleteSession() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const idToken = hash.get("idToken") || query.get("idToken");
    const invitationToken = hash.get("invite") || query.get("invite");
    history.replaceState(null, "", "/auth/complete");
    if (!idToken) {
      setError("No pudimos completar el acceso. Volvé al inicio e intentá otra vez.");
      return;
    }
    completeSessionFromIdToken(idToken, invitationToken).catch((caught) => {
      setError(googleAuthMessage(caught));
    });
  }, []);

  return (
    <div className="centeredPage shell narrowShell">
      <section className="messageCard">
        <p className="kicker">Acceso</p>
        <h1>{error ? "No pudimos dejarte entrar." : "Entrando…"}</h1>
        <p>{error ?? "Google ya te reconoció. Estamos abriendo el club."}</p>
        {error ? (
          <a className="primaryButton" href="/">
            Volver al inicio
          </a>
        ) : null}
      </section>
    </div>
  );
}
