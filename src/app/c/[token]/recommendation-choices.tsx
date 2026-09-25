"use client";

import { useActionState, useState } from "react";

import { recommendationImageUrl, type PhoneRecommendations, type RecommendationId } from "@/lib/recommendation-policy";

import { submitRecommendationAction, type PhoneCritiqueState } from "./actions";

const initial: PhoneCritiqueState = { error: null, message: null };

export function RecommendationChoices({ data, name, token }: {
  data: PhoneRecommendations;
  name: string;
  token: string;
}) {
  const [selection, setSelection] = useState<RecommendationId[]>(data.selection);
  const [saved, setSaved] = useState<RecommendationId[]>(data.selection);
  const [state, action, pending] = useActionState(async (previous: PhoneCritiqueState, formData: FormData) => {
    const result = await submitRecommendationAction(previous, formData);
    if (!result.error) setSaved(formData.getAll("movieIds") as RecommendationId[]);
    return result;
  }, initial);
  const closed = data.round.status === "closed";
  const chosen = closed ? data.selection : selection;
  const dirty = selection.length !== saved.length || selection.some((id) => !saved.includes(id));

  return (
    <section className="critiquePhone recommendationPhone">
      <header className="recommendationPhoneHeader">
        <p className="kicker">Después de los créditos</p>
        <h1>Pochoclo <i>Recomienda</i></h1>
        <p>{closed ? "Nos vemos en la próxima." : "¿Cuál te gustaría ver?"}</p>
        <span>{closed ? "La selección terminó." : "Elegí una, dos o las tres."}</span>
      </header>
      <form action={action} onReset={(event) => event.preventDefault()}>
        <input name="token" type="hidden" value={token} />
        <fieldset className="recommendationChoices" disabled={pending || closed}>
          <legend className="srOnly">Películas que te gustaría ver</legend>
          {data.round.movies.map((movie, index) => {
            const selected = chosen.includes(movie.id);
            return (
              <label className={`recommendationChoice${selected ? " isSelected" : ""}`} key={movie.id}>
                <input
                  checked={selected}
                  name="movieIds"
                  onChange={(event) => setSelection((current) => event.target.checked ? [...current, movie.id] : current.filter((id) => id !== movie.id))}
                  type="checkbox"
                  value={movie.id}
                />
                <span className="recommendationArt">
                  <img alt={`Arte de ${movie.title}`} src={recommendationImageUrl(data.round.screeningId, movie, "landscape", token)} />
                  <span className="recommendationNumber">0{index + 1}</span>
                  <span className="recommendationCheck" aria-hidden="true">{selected ? "✓" : "+"}</span>
                </span>
                <span className="recommendationChoiceCopy">
                  <span className="recommendationCredit">{movie.director}{movie.year ? ` · ${movie.year}` : ""}</span>
                  <strong className="recommendationChoiceTitle">{movie.title}</strong>
                  <span className="recommendationReason">{movie.reason}</span>
                  <span className="recommendationChoiceCue">{selected ? "En tu selección" : closed ? "" : "Me gustaría verla"}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="recommendationSaveBar">
          <div><strong>{chosen.length} / 3</strong><span>{name.split(" ")[0]}, {closed ? "estas fueron tus elecciones." : "seguí tu curiosidad."}</span></div>
          {closed ? (
            <p role="status">{chosen.length ? "Tus preferencias quedaron guardadas." : "No llegaste a guardar una selección."}</p>
          ) : (
            <>
              <button className="primaryButton" disabled={pending || !selection.length || (!dirty && saved.length > 0)} type="submit">
                {pending ? "Guardando…" : !dirty && saved.length ? "Elecciones guardadas ✓" : saved.length ? "Actualizar mis elecciones" : "Guardar mis elecciones"}
              </button>
              <p className="recommendationSaveHint">{dirty ? "Tenés cambios sin guardar." : "Podés cambiar de idea hasta que cierre la selección."}</p>
              {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
              {state.message && !dirty ? <p className="srOnly" role="status">{state.message}</p> : null}
            </>
          )}
        </div>
      </form>
    </section>
  );
}
