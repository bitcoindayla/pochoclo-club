"use client";

import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useState } from "react";

import { getClientAuth } from "@/lib/firebase/client";

type Props = {
  invitationToken?: string;
  label?: string;
  hint?: string;
  dark?: boolean;
};

const errorMessages: Record<string, string> = {
  "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permití ventanas emergentes e intentá otra vez.",
  "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
  "auth/cancelled-popup-request": "El acceso anterior fue cancelado. Intentá otra vez.",
  "auth/unauthorized-domain": "Este dominio todavía no está autorizado en Firebase Authentication.",
};

export function GoogleSignInButton({
  invitationToken,
  label = "Continuar con Google",
  hint,
  dark = false,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setPending(true);
    setError(null);

    try {
      const csrfResponse = await fetch("/api/session/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("No se pudo preparar el acceso.");
      const { token: csrfToken } = (await csrfResponse.json()) as { token: string };

      const auth = await getClientAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const sessionResponse = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, invitationToken, csrfToken }),
      });
      const sessionResult = (await sessionResponse.json()) as { code?: string };
      await signOut(auth);

      if (!sessionResponse.ok) {
        window.location.assign(
          `/acceso-denegado?reason=${encodeURIComponent(sessionResult.code ?? "session-error")}`,
        );
        return;
      }

      window.location.assign("/club");
    } catch (caughtError) {
      if (caughtError instanceof FirebaseError) {
        setError(errorMessages[caughtError.code] ?? "Google no pudo completar el acceso.");
      } else {
        setError(caughtError instanceof Error ? caughtError.message : "No se pudo iniciar sesión.");
      }
      setPending(false);
    }
  }

  return (
    <div className="signInControl">
      <button
        className={`googleButton${dark ? " darkGoogleButton" : ""}`}
        disabled={pending}
        onClick={handleSignIn}
        type="button"
      >
        <span className="googleGlyph" aria-hidden="true">G</span>
        <span className="googleButtonText">
          {pending ? "Abriendo Google…" : label}
          {!pending && hint ? <span className="googleButtonHint"> ({hint})</span> : null}
        </span>
      </button>
      {error ? <p className="signInError" role="alert">{error}</p> : null}
    </div>
  );
}
