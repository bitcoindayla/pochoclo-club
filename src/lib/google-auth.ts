"use client";

import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type UserCredential,
} from "firebase/auth";

import { getClientAuth } from "@/lib/firebase/client";

const INVITE_KEY = "pochoclo.invite";

export const googleAuthErrors: Record<string, string> = {
  "auth/popup-blocked":
    "El navegador bloqueó la ventana de Google. Permití ventanas emergentes e intentá otra vez.",
  "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
  "auth/cancelled-popup-request": "El acceso anterior fue cancelado. Intentá otra vez.",
  "auth/unauthorized-domain":
    "Este dominio todavía no está autorizado en Firebase Authentication.",
  "auth/missing-initial-state":
    "Safari perdió el acceso a medio camino. Cerrá la pestaña, volvé a pochoclo.club e intentá de nuevo.",
};

export function googleAuthMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    return googleAuthErrors[error.code] ?? "Google no pudo completar el acceso.";
  }
  return error instanceof Error ? error.message : "No se pudo iniciar sesión.";
}

export function shouldUseGoogleRedirect() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/i.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

async function exchangeSession(credential: UserCredential, invitationToken?: string | null) {
  const csrfResponse = await fetch("/api/session/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("No se pudo preparar el acceso.");
  const { token: csrfToken } = (await csrfResponse.json()) as { token: string };
  const idToken = await credential.user.getIdToken();
  const sessionResponse = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      invitationToken: invitationToken || undefined,
      csrfToken,
    }),
  });
  const sessionResult = (await sessionResponse.json()) as { code?: string };
  const auth = await getClientAuth();
  await signOut(auth);

  if (!sessionResponse.ok) {
    window.location.assign(
      `/acceso-denegado?reason=${encodeURIComponent(sessionResult.code ?? "session-error")}`,
    );
    return;
  }

  window.location.assign("/club");
}

export async function startGoogleSignIn(invitationToken?: string) {
  const auth = await getClientAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  if (shouldUseGoogleRedirect()) {
    if (invitationToken) sessionStorage.setItem(INVITE_KEY, invitationToken);
    else sessionStorage.removeItem(INVITE_KEY);
    await signInWithRedirect(auth, provider);
    return;
  }

  const result = await signInWithPopup(auth, provider);
  await exchangeSession(result, invitationToken);
}

export async function completeGoogleRedirectIfNeeded() {
  const auth = await getClientAuth();
  const result = await getRedirectResult(auth);
  if (!result) return false;
  const invitationToken = sessionStorage.getItem(INVITE_KEY);
  sessionStorage.removeItem(INVITE_KEY);
  await exchangeSession(result, invitationToken);
  return true;
}
