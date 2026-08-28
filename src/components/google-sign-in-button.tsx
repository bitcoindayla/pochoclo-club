"use client";

import { useState } from "react";

import { googleAuthMessage, startGoogleSignIn } from "@/lib/google-auth";

type Props = {
  invitationToken?: string;
  label?: string;
  hint?: string;
  dark?: boolean;
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
      await startGoogleSignIn(invitationToken);
    } catch (caughtError) {
      setError(googleAuthMessage(caughtError));
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
