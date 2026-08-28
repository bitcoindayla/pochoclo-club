"use client";

import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth";

import { getClientAuth } from "@/lib/firebase/client";

const INVITE_KEY = "pochoclo.invite";
const GOOGLE_WEB_CLIENT_ID =
  "274140905514-stf3bujnl25rglqnp86n5j0ng0ulgtlv.apps.googleusercontent.com";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

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

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-pochoclo-gsi]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Google.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.pochocloGsi = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google."));
    document.head.appendChild(script);
  });
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

async function signInWithGoogleOnThisPage(invitationToken?: string) {
  await loadGoogleIdentity();
  if (!window.google?.accounts.oauth2) {
    throw new Error("Google no pudo completar el acceso.");
  }

  await new Promise<void>((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        void (async () => {
          try {
            if (response.error || !response.access_token) {
              throw new Error(
                response.error_description || "Google no pudo completar el acceso.",
              );
            }
            const auth = await getClientAuth();
            const credential = GoogleAuthProvider.credential(null, response.access_token);
            const result = await signInWithCredential(auth, credential);
            await exchangeSession(result, invitationToken);
            resolve();
          } catch (error) {
            reject(error);
          }
        })();
      },
      error_callback: (error) => {
        reject(
          new Error(
            error.message || "Se canceló el acceso con Google. Intentá otra vez.",
          ),
        );
      },
    });
    tokenClient.requestAccessToken({ prompt: "select_account" });
  });
}

export async function startGoogleSignIn(invitationToken?: string) {
  if (shouldUseGoogleRedirect()) {
    await signInWithGoogleOnThisPage(invitationToken);
    return;
  }

  const auth = await getClientAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
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
