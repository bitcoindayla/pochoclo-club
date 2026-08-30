"use client";

import { useEffect, useId, useState } from "react";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { shouldUseGoogleRedirect } from "@/lib/google-auth";

type LandingDialog = "access" | "join";

export function LandingAccess() {
  const [dialog, setDialog] = useState<LandingDialog | null>(null);
  const [mobileGoogle, setMobileGoogle] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMobileGoogle(shouldUseGoogleRedirect());
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [dialog]);

  return (
    <>
      <div className="landingCtas">
        <button className="landingCta landingCtaMember" onClick={() => setDialog("access")} type="button">
          Ingreso miembros
        </button>
        <button className="landingCta landingCtaJoin" onClick={() => setDialog("join")} type="button">
          Quiero participar
        </button>
      </div>
      {dialog ? (
        <div className="a24Scrim" role="presentation" onClick={() => setDialog(null)}>
          <div
            className="a24Dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="a24DialogHead">
              <p className="kicker">{dialog === "access" ? "Acceso" : "Invitación"}</p>
              <button className="dialogClose" onClick={() => setDialog(null)} type="button" aria-label="Cerrar">
                ×
              </button>
            </div>
            {dialog === "access" ? (
              <>
                <h2 id={titleId}>Ingresá con tu Gmail de siempre.</h2>
                <p className="a24DialogCopy">Solo para miembros con cuenta activa.</p>
                <GoogleSignInButton
                  hint={mobileGoogle ? undefined : "Habilitar Pop-up screen"}
                  label="Continuar con Google"
                />
              </>
            ) : (
              <>
                <h2 id={titleId}>El club es por invitación.</h2>
                <p className="a24DialogCopy">
                  Catorce lugares, un domingo, una sala privada. Pedile a un miembro que te invite al
                  próximo encuentro. Si ya tenés el enlace, usalo: no hay alta pública.
                </p>
                <button className="landingCta landingCtaMember" onClick={() => setDialog("access")} type="button">
                  Ya soy miembro
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
