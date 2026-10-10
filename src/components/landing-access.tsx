"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { shouldUseGoogleRedirect } from "@/lib/google-auth";

export function LandingAccess({
  compact = false,
  join = true,
}: {
  compact?: boolean;
  join?: boolean;
}) {
  const [dialog, setDialog] = useState(false);
  const [mobileGoogle, setMobileGoogle] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMobileGoogle(shouldUseGoogleRedirect()));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(false);
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
      <div className={compact ? "landingCtas landingCtasCompact" : "landingCtas"}>
        <button className="landingCta landingCtaMember" onClick={() => setDialog(true)} type="button">
          Ya soy miembro
        </button>
        {join ? (
          <Link className="landingCta landingCtaJoin" href="/participar">
            Quiero participar
          </Link>
        ) : null}
      </div>
      {dialog ? (
        <div className="a24Scrim" role="presentation" onClick={() => setDialog(false)}>
          <div
            className="a24Dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="a24DialogHead">
              <p className="kicker">Acceso</p>
              <button className="dialogClose" onClick={() => setDialog(false)} type="button" aria-label="Cerrar">
                ×
              </button>
            </div>
            <h2 id={titleId}>Ingresá con tu Gmail de siempre.</h2>
            <p className="a24DialogCopy">Solo para quienes ya tienen lugar en el club.</p>
            <GoogleSignInButton
              hint={mobileGoogle ? undefined : "Habilitar Pop-up screen"}
              label="Continuar con Google"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
