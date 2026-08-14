"use client";

import { useActionState, useEffect, useId, useState } from "react";

import {
  clearLandingImageAction,
  updateLandingImageAction,
  type LandingActionState,
} from "@/app/actions/landing";
import type { LandingVisual } from "@/lib/landing";

const initialState: LandingActionState = { error: null, message: null };

export function LandingPhotoEditor({ visual }: { visual: LandingVisual | null }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const titleId = useId();
  const [saveState, saveAction, saving] = useActionState(updateLandingImageAction, initialState);
  const [clearState, clearAction, clearing] = useActionState(clearLandingImageAction, initialState);
  const pending = saving || clearing;
  const error = saveState.error || clearState.error;
  const message = saveState.message || clearState.message;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button className="textButton" onClick={() => setOpen(true)} type="button">
        {visual ? "Cambiar foto" : "Cargar foto"}
      </button>
      {open ? (
        <div className="a24Scrim" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="a24Dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="a24DialogHead">
              <p className="kicker">Portada</p>
              <button className="dialogClose" onClick={() => setOpen(false)} type="button" aria-label="Cerrar">
                ×
              </button>
            </div>
            <h2 id={titleId}>
              {visual ? "Reemplazá el still cuando quieras." : "Cargá un still para la bienvenida."}
            </h2>
            <p className="a24DialogCopy">
              JPG, PNG o WebP, hasta 3 MB. Se recorta a horizontal y vertical.
            </p>
            {visual ? (
              <div className="landingEditorPreview">
                {/* Dynamic Storage still; next/image would need a remote loader. */}
                <img alt="Portada actual" src={visual.landscapeUrl} />
              </div>
            ) : null}
            <form action={saveAction} className="landingEditorForm">
              <label className="landingFile">
                <span>{fileName || "Elegir foto"}</span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  name="image"
                  onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
                  type="file"
                />
              </label>
              <button className="primaryButton" disabled={pending || !fileName} type="submit">
                {saving ? "Guardando…" : visual ? "Reemplazar" : "Publicar"}
              </button>
            </form>
            {visual ? (
              <form action={clearAction}>
                <button className="dangerButton" disabled={pending} type="submit">
                  {clearing ? "Sacando…" : "Quitar foto"}
                </button>
              </form>
            ) : null}
            {error ? <p className="formError" role="alert">{error}</p> : null}
            {message ? <p className="formSuccess" role="status">{message}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
