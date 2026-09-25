"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { RecommendationRound } from "@/lib/recommendation-policy";

import { closeRecommendationsAction, revealRecommendationsAction, type RecommendationActionState } from "./recommendation-actions";

const initial: RecommendationActionState = { error: null, message: null };

export function RecommendationControls({ screeningId, round, critiqueClosed }: {
  screeningId: string;
  round: RecommendationRound | null;
  critiqueClosed: boolean;
}) {
  const [revealState, revealAction, revealing] = useActionState(revealRecommendationsAction, initial);
  const [closeState, closeAction, closing] = useActionState(closeRecommendationsAction, initial);
  const ready = round?.movies.length === 3 && round.movies.every((movie) => movie.image);
  return (
    <section className="recommendationControls">
      <div>
        <p className="kicker">Pochoclo Recomienda</p>
        <p>{round?.status === "closed"
          ? "Las preferencias quedaron guardadas en las fichas de los miembros."
          : round?.status === "open"
            ? "Los teléfonos ya pueden elegir. Al cerrar se muestran los resultados en la pantalla."
            : !ready
              ? "Prepará el arte y los textos de las tres películas antes de revelarlas."
              : !critiqueClosed
                ? "Todo listo. Primero cerrá y publicá los puntajes de la crítica."
                : "Todo listo. Vos decidís cuándo revelar las tres películas."}</p>
      </div>
      {!round || round.status === "draft" ? (
        <div className="buttonRow">
          <Link className="textButton" href="/admin/critica#recomienda">Preparar películas</Link>
          <form action={revealAction}>
            <input name="screeningId" type="hidden" value={screeningId} />
            <button className="primaryButton" disabled={!ready || !critiqueClosed || revealing} type="submit">
              {revealing ? "Revelando…" : "Mostrar Pochoclo Recomienda"}
            </button>
          </form>
        </div>
      ) : round.status === "open" ? (
        <form action={closeAction}>
          <input name="screeningId" type="hidden" value={screeningId} />
          <button className="secondaryButton" disabled={closing} type="submit">{closing ? "Cerrando…" : "Cerrar selección y mostrar resultados"}</button>
        </form>
      ) : null}
      {revealState.error || closeState.error ? <p className="formError" role="alert">{revealState.error || closeState.error}</p> : null}
    </section>
  );
}
