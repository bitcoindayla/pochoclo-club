"use client";

import { startTransition, useActionState, useEffect, useState } from "react";

import type { MemberSearchItem } from "@/lib/members";
import type { MovieBallot } from "@/lib/movie-voting";
import type { Screening } from "@/lib/screenings";

import {
  cancelMovieBallotAction,
  chooseMovieWinnerAction,
  closeMovieBallotAction,
  createMovieBallotAction,
  grantMovieBallotExemptionAction,
  openMovieBallotAction,
  type MovieBallotActionState,
  updateMovieBallotAction,
} from "./actions";

const initialState: MovieBallotActionState = { error: null, message: null };
const MAX_ORIGINAL_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_PREPARED_IMAGE_BYTES = 500 * 1024;
const MAX_PREPARED_BATCH_BYTES = 3 * 1024 * 1024;
const MAX_PREVIEW_EDGE = 1_920;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("No pudimos optimizar la imagen.")),
      "image/webp",
      quality,
    );
  });
}

async function prepareImageForUpload(file: File) {
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new Error(`${file.name} pesa más de 20 MB.`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`No pudimos leer ${file.name}. Probá con otra imagen.`);
  }

  const scale = Math.min(1, MAX_PREVIEW_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("No pudimos optimizar la imagen.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await canvasBlob(canvas, 0.86);
  for (const quality of [0.78, 0.7, 0.62, 0.54]) {
    if (blob.size <= MAX_PREPARED_IMAGE_BYTES) break;
    blob = await canvasBlob(canvas, quality);
  }
  if (blob.size > MAX_PREPARED_IMAGE_BYTES) {
    const secondScale = Math.min(1, 1_600 / Math.max(canvas.width, canvas.height));
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(1, Math.round(canvas.width * secondScale));
    smaller.height = Math.max(1, Math.round(canvas.height * secondScale));
    smaller.getContext("2d")?.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    blob = await canvasBlob(smaller, 0.68);
  }
  if (blob.size > MAX_PREPARED_IMAGE_BYTES) {
    throw new Error(`No pudimos reducir ${file.name}. Probá guardándola como JPG o WebP.`);
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
    type: "image/webp",
  });
}

type BallotFormProps = {
  ballot?: MovieBallot;
  screenings: Screening[];
};

function MovieImageInput({
  ballot,
  movie,
  position,
}: {
  ballot?: MovieBallot;
  movie?: MovieBallot["options"][number];
  position: number;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const currentUrl = movie?.image && ballot
    ? `/api/movie-images/${ballot.screeningId}/${movie.id}/landscape?v=${encodeURIComponent(movie.image.landscapePath)}`
    : null;

  return (
    <div className="fieldGroup wideField movieImageField">
      <label htmlFor={`movieImage${position}-${ballot?.id ?? "new"}`}>
        Imagen de pantalla
      </label>
      {previewUrl || currentUrl ? (
        <div className="movieImagePreview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`Vista previa de ${movie?.title || `película ${position}`}`}
            src={previewUrl || currentUrl || ""}
          />
          <span>
            {previewUrl
              ? `Nueva imagen seleccionada · ${previewName}`
              : `Imagen actual · ${movie?.image?.sourceWidth} × ${movie?.image?.sourceHeight} px`}
          </span>
        </div>
      ) : null}
      <input
        accept="image/jpeg,image/png,image/webp"
        id={`movieImage${position}-${ballot?.id ?? "new"}`}
        name={`movieImage${position}`}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          setPreviewName(file?.name ?? null);
          setPreviewUrl(file ? URL.createObjectURL(file) : null);
        }}
        type="file"
      />
      <small>
        JPG, PNG o WebP · hasta 20 MB. Recomendado 1600 × 900 px; mínimo 640 × 360 px.
        {movie?.image ? " Elegí otra solamente si querés reemplazarla." : " La podés agregar ahora o después."}
      </small>
    </div>
  );
}

export function BallotForm({ ballot, screenings }: BallotFormProps) {
  const serverAction = ballot ? updateMovieBallotAction : createMovieBallotAction;
  const [state, action, pending] = useActionState(serverAction, initialState);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const options = ballot?.options ?? [];

  return (
    <form
      className="ballotForm"
      encType="multipart/form-data"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const images = [1, 2, 3, 4, 5]
          .map((position) => ({ position, file: formData.get(`movieImage${position}`) }))
          .filter(
            (entry): entry is { position: number; file: File } =>
              entry.file instanceof File && entry.file.size > 0,
          );
        setPreparing(true);
        setUploadError(null);
        try {
          for (const { position, file } of images) {
            formData.set(`movieImage${position}`, await prepareImageForUpload(file));
          }
          const preparedBytes = [1, 2, 3, 4, 5].reduce((total, position) => {
            const image = formData.get(`movieImage${position}`);
            return total + (image instanceof File ? image.size : 0);
          }, 0);
          if (preparedBytes > MAX_PREPARED_BATCH_BYTES) {
            throw new Error("No pudimos optimizar todas las imágenes. Probá guardándolas de a una.");
          }
          startTransition(() => {
            action(formData);
          });
        } catch (error) {
          setUploadError(error instanceof Error ? error.message : "No pudimos preparar las imágenes.");
        } finally {
          setPreparing(false);
        }
      }}
    >
      <div className="ballotTiming">
        <div className="fieldGroup wideField">
          <label htmlFor={`screening-${ballot?.id ?? "new"}`}>Función</label>
          {ballot ? (
            <>
              <input name="screeningId" type="hidden" value={ballot.screeningId} />
              <p className="fixedField">
                {screenings.find((screening) => screening.id === ballot.screeningId)?.title ||
                  "Función sin título"}
              </p>
            </>
          ) : (
            <select id="screening-new" name="screeningId" required>
              <option value="">Elegí un borrador</option>
              {screenings.map((screening) => (
                <option key={screening.id} value={screening.id}>
                  {screening.localDate} {screening.localTime} · {screening.title || "Sin título"}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="fieldGroup">
          <label htmlFor={`closeDate-${ballot?.id ?? "new"}`}>Cierra el día</label>
          <input
            defaultValue={ballot?.localCloseDate}
            id={`closeDate-${ballot?.id ?? "new"}`}
            name="closeDate"
            required
            type="date"
          />
        </div>
        <div className="fieldGroup">
          <label htmlFor={`closeTime-${ballot?.id ?? "new"}`}>A las</label>
          <input
            defaultValue={ballot?.localCloseTime}
            id={`closeTime-${ballot?.id ?? "new"}`}
            name="closeTime"
            required
            type="time"
          />
        </div>
      </div>

      <div className="movieEditorGrid">
        {[1, 2, 3, 4, 5].map((position) => {
          const movie = options.find((option) => option.id === `movie-${position}`);
          const required = position <= 3;
          return (
            <fieldset className="movieEditor" key={position}>
              <legend>
                Película {position} {!required ? <span>opcional</span> : null}
              </legend>
              <div className="fieldGroup">
                <label htmlFor={`movieTitle${position}-${ballot?.id ?? "new"}`}>Título</label>
                <input
                  defaultValue={movie?.title}
                  id={`movieTitle${position}-${ballot?.id ?? "new"}`}
                  maxLength={120}
                  name={`movieTitle${position}`}
                  required={required}
                />
              </div>
              <div className="fieldGroup">
                <label htmlFor={`movieYear${position}-${ballot?.id ?? "new"}`}>Año</label>
                <input
                  defaultValue={movie?.year}
                  id={`movieYear${position}-${ballot?.id ?? "new"}`}
                  inputMode="numeric"
                  maxLength={4}
                  name={`movieYear${position}`}
                  required={required}
                />
              </div>
              <div className="fieldGroup">
                <label htmlFor={`movieDirector${position}-${ballot?.id ?? "new"}`}>Dirección</label>
                <input
                  defaultValue={movie?.director}
                  id={`movieDirector${position}-${ballot?.id ?? "new"}`}
                  maxLength={120}
                  name={`movieDirector${position}`}
                  required={required}
                />
              </div>
              <div className="fieldGroup wideField">
                <label htmlFor={`movieBio${position}-${ballot?.id ?? "new"}`}>Breve sinopsis</label>
                <textarea
                  defaultValue={movie?.bio}
                  id={`movieBio${position}-${ballot?.id ?? "new"}`}
                  maxLength={360}
                  name={`movieBio${position}`}
                  required={required}
                  rows={4}
                />
              </div>
              <MovieImageInput ballot={ballot} movie={movie} position={position} />
            </fieldset>
          );
        })}
      </div>

      <button className="primaryButton" disabled={pending || preparing} type="submit">
        {preparing ? "Preparando imágenes…" : pending ? "Guardando…" : ballot ? "Guardar cambios" : "Crear cartelera"}
      </button>
      {uploadError ? <p className="formError" role="alert">{uploadError}</p> : null}
      <small className="imageUploadLimit">
        Podés subir las cinco juntas: las optimizamos automáticamente sin deformarlas.
      </small>
      {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
      {state.message ? <p className="formSuccess" role="status">{state.message}</p> : null}
    </form>
  );
}

function BallotAction({
  ballot,
  kind,
}: {
  ballot: MovieBallot;
  kind: "open" | "close" | "cancel";
}) {
  const serverAction =
    kind === "open"
      ? openMovieBallotAction
      : kind === "close"
        ? closeMovieBallotAction
        : cancelMovieBallotAction;
  const [state, action, pending] = useActionState(serverAction, initialState);
  const labels = {
    open: pending ? "Abriendo…" : "Abrir votación y reservas",
    close: pending ? "Cerrando…" : "Cerrar votación ahora",
    cancel: pending ? "Cancelando…" : "Cancelar votación",
  };

  return (
    <form
      action={action}
      className="openScreeningForm"
      onSubmit={(event) => {
        if (
          kind === "cancel" &&
          !window.confirm("¿Cancelar la votación? La función seguirá como función especial.")
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="screeningId" type="hidden" value={ballot.screeningId} />
      <button
        className={kind === "cancel" ? "dangerButton" : "secondaryButton"}
        disabled={pending}
        type="submit"
      >
        {labels[kind]}
      </button>
      {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
      {state.message ? <p className="formSuccess" role="status">{state.message}</p> : null}
    </form>
  );
}

export function DraftBallotActions({ ballot }: { ballot: MovieBallot }) {
  return (
    <div className="compactActions">
      <BallotAction ballot={ballot} kind="open" />
      <BallotAction ballot={ballot} kind="cancel" />
    </div>
  );
}

export function OpenBallotActions({ ballot }: { ballot: MovieBallot }) {
  return (
    <div className="compactActions">
      <BallotAction ballot={ballot} kind="close" />
      <BallotAction ballot={ballot} kind="cancel" />
    </div>
  );
}

export function TieBreaker({ ballot }: { ballot: MovieBallot }) {
  const [state, action, pending] = useActionState(chooseMovieWinnerAction, initialState);
  const finalists = ballot.options.filter((option) =>
    ballot.decisionOptionIds.includes(option.id),
  );
  return (
    <form action={action} className="tieBreaker">
      <input name="screeningId" type="hidden" value={ballot.screeningId} />
      <label htmlFor={`winner-${ballot.id}`}>Elegí la ganadora</label>
      <select id={`winner-${ballot.id}`} name="optionId" required>
        <option value="">Película finalista</option>
        {finalists.map((movie) => (
          <option key={movie.id} value={movie.id}>{movie.title}</option>
        ))}
      </select>
      <button className="primaryButton" disabled={pending} type="submit">
        {pending ? "Guardando…" : "Confirmar ganadora"}
      </button>
      {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
      {state.message ? <p className="formSuccess" role="status">{state.message}</p> : null}
    </form>
  );
}

export function ExemptionForm({
  ballot,
  members,
  exemptMemberIds,
}: {
  ballot: MovieBallot;
  members: MemberSearchItem[];
  exemptMemberIds: string[];
}) {
  const [state, action, pending] = useActionState(
    grantMovieBallotExemptionAction,
    initialState,
  );
  const candidates = members.filter((member) => !exemptMemberIds.includes(member.id));
  return (
    <form action={action} className="exemptionForm">
      <input name="screeningId" type="hidden" value={ballot.screeningId} />
      <label htmlFor={`exemption-${ballot.id}`}>Excepción para reservar sin votar</label>
      <select id={`exemption-${ballot.id}`} name="memberId" required>
        <option value="">Elegí un miembro</option>
        {candidates.map((member) => (
          <option key={member.id} value={member.id}>{member.name}</option>
        ))}
      </select>
      <button className="smallButton" disabled={pending || candidates.length === 0} type="submit">
        {pending ? "Guardando…" : "Dar excepción"}
      </button>
      {exemptMemberIds.length ? <small>{exemptMemberIds.length} excepción/es concedida/s.</small> : null}
      {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
      {state.message ? <p className="formSuccess" role="status">{state.message}</p> : null}
    </form>
  );
}
