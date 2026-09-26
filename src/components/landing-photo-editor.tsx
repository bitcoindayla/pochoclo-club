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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileName = selectedFile?.name;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [version, setVersion] = useState(visual?.version ?? "");
  const [movie, setMovie] = useState({
    title: visual?.movie?.title ?? "",
    year: String(visual?.movie?.year ?? ""),
    director: visual?.movie?.director ?? "",
  });
  const titleId = useId();
  const [saveState, saveAction, saving] = useActionState(async (previous: LandingActionState, data: FormData) => {
    // React resets the native file input after an action resolves, including
    // validation errors. Keep the selected file and draft available for retry.
    if (selectedFile) data.set("image", selectedFile);
    const result = await updateLandingImageAction(previous, data);
    if (!result.error) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setOpen(false);
    }
    return result;
  }, initialState);
  const [clearState, clearAction, clearing] = useActionState(clearLandingImageAction, initialState);
  const pending = saving || clearing;
  const error = saveState.error || clearState.error;
  const message = saveState.message || clearState.message;

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

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
      <button className="textButton" onClick={() => {
        setVersion(visual?.version ?? "");
        setSelectedFile(null);
        setPreviewUrl(null);
        setMovie({
          title: visual?.movie?.title ?? "",
          year: String(visual?.movie?.year ?? ""),
          director: visual?.movie?.director ?? "",
        });
        setOpen(true);
      }} type="button">
        {visual ? "Cambiar foto" : "Cargar foto"}
      </button>
      {open ? (
        <div className="a24Scrim" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="a24Dialog landingEditorDialog"
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
              {visual ? "La foto y su película." : "Cargá una foto para la bienvenida."}
            </h2>
            <p className="a24DialogCopy">
              JPG, PNG o WebP, hasta 3 MB. Los datos aparecen abajo a la derecha de la foto. El color del logo se adapta automáticamente.
            </p>
            {previewUrl || visual ? (
              <div className="landingEditorPreview">
                {/* Dynamic Storage still; next/image would need a remote loader. */}
                <img alt={previewUrl ? "Nueva portada" : "Portada actual"} src={previewUrl ?? visual?.landscapeUrl} />
              </div>
            ) : null}
            <form action={saveAction} className="landingEditorForm">
              <input type="hidden" name="version" value={version} />
              <div className="fieldGroup landingMovieTitle">
                <label htmlFor={`${titleId}-movie`}>Nombre de la película</label>
                <input id={`${titleId}-movie`} name="title" value={movie.title} onChange={(event) => setMovie({ ...movie, title: event.target.value })} maxLength={120} required disabled={pending} />
              </div>
              <div className="fieldGroup">
                <label htmlFor={`${titleId}-year`}>Año</label>
                <input id={`${titleId}-year`} name="year" type="number" min={1888} max={2100} step={1} value={movie.year} onChange={(event) => setMovie({ ...movie, year: event.target.value })} required disabled={pending} />
              </div>
              <div className="fieldGroup">
                <label htmlFor={`${titleId}-director`}>Director/a</label>
                <input id={`${titleId}-director`} name="director" value={movie.director} onChange={(event) => setMovie({ ...movie, director: event.target.value })} maxLength={120} required disabled={pending} />
              </div>
              <label className="landingFile">
                <span>{fileName || (visual ? "Elegir otra foto (opcional)" : "Elegir foto")}</span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  name="image"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSelectedFile(file ?? null);
                    setPreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                  type="file"
                  required={!visual && !selectedFile}
                  disabled={pending}
                />
              </label>
              <button className="primaryButton" disabled={pending || (!visual && !fileName)} type="submit">
                {saving ? "Guardando…" : "Guardar portada"}
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
