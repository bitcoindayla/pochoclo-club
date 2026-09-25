"use client";

import { useActionState, useEffect, useState } from "react";

import {
  RECOMMENDATION_IDS,
  recommendationImageUrl,
  type RecommendationId,
  type RecommendationMovie,
  type RecommendationRound,
} from "@/lib/recommendation-policy";

import { saveRecommendationMovieAction, type RecommendationActionState } from "./recommendation-actions";

const initial: RecommendationActionState = { error: null, message: null };

export function RecommendationEditor({ screeningId, round }: {
  screeningId: string;
  round: RecommendationRound | null;
}) {
  const locked = Boolean(round && round.status !== "draft");
  return (
    <section className="invitationHistory recommendationEditor">
      <div className="sectionHeading">
        <div>
          <p className="kicker">Después de los créditos</p>
          <h2>Pochoclo Recomienda</h2>
        </div>
        <span>{round?.movies.filter((movie) => movie.image).length ?? 0} / 3 preparadas</span>
      </div>
      <p className="pageIntro">
        Prepará tres películas para descubrir juntos. Al terminar la crítica, vos decidís cuándo
        mostrarlas desde el control de la sala. Cada persona puede elegir una, dos o las tres.
      </p>
      {locked ? <p className="pageIntro">Esta selección ya se mostró y quedó guardada.</p> : null}
      <div className="recommendationEditors">
        {RECOMMENDATION_IDS.map((id, index) => (
          <MovieEditor
            id={id}
            index={index}
            key={id}
            locked={locked}
            movie={round?.movies.find((movie) => movie.id === id)}
            revision={round?.revision ?? 0}
            screeningId={screeningId}
          />
        ))}
      </div>
    </section>
  );
}

function MovieEditor({ id, index, locked, movie, revision, screeningId }: {
  id: RecommendationId;
  index: number;
  locked: boolean;
  movie?: RecommendationMovie;
  revision: number;
  screeningId: string;
}) {
  const [state, action, pending] = useActionState(saveRecommendationMovieAction, initial);
  const [preview, setPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: movie?.title ?? "", director: movie?.director ?? "",
    year: movie?.year?.toString() ?? "", reason: movie?.reason ?? "",
  });
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const imageUrl = preview ?? (movie?.image ? recommendationImageUrl(screeningId, movie, "landscape") : null);
  return (
    <form action={action} className="recommendationMovieForm" onReset={(event) => event.preventDefault()}>
      <input name="screeningId" type="hidden" value={screeningId} />
      <input name="movieId" type="hidden" value={id} />
      <input name="revision" type="hidden" value={revision} />
      <fieldset disabled={locked || pending}>
        <legend><span>0{index + 1}</span> {movie?.title ?? "Una nueva posibilidad"}</legend>
        <div className="recommendationUpload">
          {imageUrl ? <img alt={`Arte de ${movie?.title ?? `la película ${index + 1}`}`} src={imageUrl} /> : (
            <div className="recommendationUploadEmpty"><span>0{index + 1}</span><p>El próximo descubrimiento.</p></div>
          )}
          {!locked ? <label>
            {imageUrl ? "Cambiar arte" : "Subir arte"}
            <input accept="image/jpeg,image/png,image/webp" name="image" onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }} type="file" />
            <small>JPG, PNG o WebP · hasta 3 MB. Mejor horizontal; mínimo 640 × 360 px.</small>
          </label> : null}
        </div>
        <label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} name="title" required /></label>
        <div className="recommendationEditorMeta">
          <label>Dirección<input value={draft.director} onChange={(event) => setDraft({ ...draft, director: event.target.value })} maxLength={120} name="director" required /></label>
          <label>Año <small>(opcional)</small><input value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} inputMode="numeric" max={2100} min={1895} name="year" type="number" /></label>
        </div>
        <label>Por qué deberíamos verla
          <textarea value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} maxLength={360} name="reason" placeholder="Una breve sinopsis y eso que la hace especial para el club." required rows={4} />
          <small>Hasta 360 caracteres. Este texto aparece en la pantalla y en el teléfono.</small>
        </label>
        {!locked ? <button className="secondaryButton" type="submit">{pending ? "Guardando…" : `Guardar película ${index + 1}`}</button> : null}
      </fieldset>
      {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
      {state.message ? <p className="formSuccess" role="status">{state.message}</p> : null}
    </form>
  );
}
