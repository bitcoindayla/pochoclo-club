"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import type { MemberSearchItem } from "@/lib/members";
import type { MovieBallot } from "@/lib/movie-voting";
import type { Screening } from "@/lib/screenings";

import type { MovieCatalogCard } from "@/lib/imdb-policy";

import {
  cancelMovieBallotAction,
  chooseMovieWinnerAction,
  closeMovieBallotAction,
  createMovieBallotAction,
  grantMovieBallotExemptionAction,
  lookupMovieCatalogAction,
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

type BallotDefaults = {
  screeningDate: string;
  screeningTime: string;
  closeDate: string;
  closeTime: string;
};

type BallotFormProps = {
  ballot?: MovieBallot;
  screenings: Screening[];
  defaults?: BallotDefaults;
};

function fieldValue(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) return field.value.trim();
  return "";
}

function setFieldValue(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    field.value = value;
  }
}

function applyCatalogCard(form: HTMLFormElement, position: number, movie: MovieCatalogCard) {
  setFieldValue(form, `movieYear${position}`, String(movie.year));
  if (movie.director) setFieldValue(form, `movieDirector${position}`, movie.director);
  setFieldValue(form, `movieImdb${position}`, movie.imdbUrl);
  if (movie.bio) setFieldValue(form, `movieBio${position}`, movie.bio);
}

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

export function BallotForm({ ballot, screenings, defaults }: BallotFormProps) {
  const serverAction = ballot ? updateMovieBallotAction : createMovieBallotAction;
  const [state, action, pending] = useActionState(serverAction, initialState);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [useDraft, setUseDraft] = useState(false);
  const [lookupBusy, setLookupBusy] = useState<number | "all" | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const options = ballot?.options ?? [];

  async function completePosition(position: number) {
    const form = formRef.current;
    if (!form) return false;
    const title = fieldValue(form, `movieTitle${position}`);
    if (!title) {
      setLookupError(`Escribí el título de la película ${position}.`);
      return false;
    }
    const result = await lookupMovieCatalogAction(title, fieldValue(form, `movieYear${position}`));
    if (result.error || !result.movie) {
      setLookupError(result.error || `No encontramos la película ${position}.`);
      return false;
    }
    applyCatalogCard(form, position, result.movie);
    return true;
  }

  async function completeMovies(positions: number[]) {
    setLookupError(null);
    setLookupBusy(positions.length > 1 ? "all" : positions[0] ?? null);
    try {
      for (const position of positions) {
        const form = formRef.current;
        if (!form) return;
        if (!fieldValue(form, `movieTitle${position}`)) continue;
        const ok = await completePosition(position);
        if (!ok) return;
      }
    } finally {
      setLookupBusy(null);
    }
  }

  return (
    <form
      ref={formRef}
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
        {ballot ? (
          <div className="fieldGroup wideField">
            <label>Función</label>
            <input name="screeningId" type="hidden" value={ballot.screeningId} />
            <p className="fixedField">
              {screenings.find((screening) => screening.id === ballot.screeningId)?.title ||
                "Función sin título"}
            </p>
          </div>
        ) : (
          <>
            {screenings.length ? (
              <div className="fieldGroup wideField">
                <label htmlFor="screening-mode">Función</label>
                <select
                  id="screening-mode"
                  onChange={(event) => setUseDraft(event.currentTarget.value === "draft")}
                  value={useDraft ? "draft" : "new"}
                >
                  <option value="new">Crear la fecha acá</option>
                  <option value="draft">Usar un borrador ya creado</option>
                </select>
              </div>
            ) : null}
            {useDraft ? (
              <div className="fieldGroup wideField">
                <label htmlFor="screening-new">Borrador</label>
                <select id="screening-new" name="screeningId" required>
                  <option value="">Elegí un borrador</option>
                  {screenings.map((screening) => (
                    <option key={screening.id} value={screening.id}>
                      {screening.localDate} {screening.localTime} · {screening.title || "Sin título"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="fieldGroup">
                  <label htmlFor="date">Fecha de la función</label>
                  <input
                    defaultValue={defaults?.screeningDate}
                    id="date"
                    name="date"
                    required
                    type="date"
                  />
                </div>
                <div className="fieldGroup">
                  <label htmlFor="time">Horario</label>
                  <input
                    defaultValue={defaults?.screeningTime}
                    id="time"
                    name="time"
                    required
                    type="time"
                  />
                </div>
                <div className="fieldGroup wideField">
                  <label htmlFor="title">Título de la noche <span>opcional</span></label>
                  <input id="title" maxLength={120} name="title" placeholder="Deseo y poder" />
                </div>
              </>
            )}
          </>
        )}
        <div className="fieldGroup">
          <label htmlFor={`closeDate-${ballot?.id ?? "new"}`}>Cierra el día</label>
          <input
            defaultValue={ballot?.localCloseDate ?? defaults?.closeDate}
            id={`closeDate-${ballot?.id ?? "new"}`}
            name="closeDate"
            required
            type="date"
          />
        </div>
        <div className="fieldGroup">
          <label htmlFor={`closeTime-${ballot?.id ?? "new"}`}>A las</label>
          <input
            defaultValue={ballot?.localCloseTime ?? defaults?.closeTime}
            id={`closeTime-${ballot?.id ?? "new"}`}
            name="closeTime"
            required
            type="time"
          />
        </div>
      </div>

      <div className="catalogToolbar">
        <button
          className="secondaryButton"
          disabled={lookupBusy !== null || pending || preparing}
          onClick={() => void completeMovies([1, 2, 3, 4, 5])}
          type="button"
        >
          {lookupBusy === "all" ? "Buscando en IMDb…" : "Completar fichas desde los títulos"}
        </button>
        <small>
          Trae año, dirección, enlace de IMDb y sinopsis. Las fotos las elegís vos. Revisá el texto
          antes de publicar: suele venir en inglés.
        </small>
      </div>
      {lookupError ? <p className="formError" role="alert">{lookupError}</p> : null}

      <div className="movieEditorGrid">
        {[1, 2, 3, 4, 5].map((position) => {
          const movie = options.find((option) => option.id === `movie-${position}`);
          const required = position <= 3;
          return (
            <fieldset className="movieEditor" key={position}>
              <legend>
                Película {position} {!required ? <span>opcional</span> : null}
              </legend>
              <div className="fieldGroup titleLookupField">
                <label htmlFor={`movieTitle${position}-${ballot?.id ?? "new"}`}>Título</label>
                <input
                  defaultValue={movie?.title}
                  id={`movieTitle${position}-${ballot?.id ?? "new"}`}
                  maxLength={120}
                  name={`movieTitle${position}`}
                  required={required}
                />
                <button
                  className="smallButton"
                  disabled={lookupBusy !== null || pending || preparing}
                  onClick={() => void completeMovies([position])}
                  type="button"
                >
                  {lookupBusy === position ? "Buscando…" : "Completar ficha"}
                </button>
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
                <label htmlFor={`movieImdb${position}-${ballot?.id ?? "new"}`}>IMDb</label>
                <input
                  defaultValue={movie?.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/` : ""}
                  id={`movieImdb${position}-${ballot?.id ?? "new"}`}
                  maxLength={220}
                  name={`movieImdb${position}`}
                  placeholder="https://www.imdb.com/title/tt1798709/"
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
