"use client";

import { useActionState, useEffect, useState } from "react";

import { CRITIQUE_CATEGORIES } from "@/lib/critique-policy";
import type { CritiqueSession } from "@/lib/critiques";

import { closeCritiqueAction, startScoringAction, type CritiqueActionState } from "./actions";

const initial: CritiqueActionState = { error: null, message: null };

export function CritiqueBoard({
  initialSession,
  qrSvg,
  scoreUrl,
}: {
  initialSession: CritiqueSession;
  qrSvg: string;
  scoreUrl: string;
}) {
  const [session, setSession] = useState(initialSession);
  const [startState, startAction, starting] = useActionState(startScoringAction, initial);
  const [closeState, closeAction, closing] = useActionState(closeCritiqueAction, initial);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/critique/live?screeningId=${encodeURIComponent(initialSession.screeningId)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      setSession((await response.json()) as CritiqueSession);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [initialSession.screeningId]);

  const waiting = session.audience.filter((row) => !row.joined);
  const ready = session.audience.filter((row) => row.joined);
  const submitted = session.audience.filter((row) => row.submitted);
  const allIn = session.joinedCount >= session.occupantCount && session.occupantCount > 0;

  return (
    <section className="critiqueBoard">
      <p className="kicker">La crítica</p>
      <h1>
        {session.movieTitle}
        <small>
          {session.movieYear} · {session.movieDirector}
        </small>
      </h1>

      {session.status === "lobby" ? (
        <div className="critiqueLobby">
          <div className="critiqueQr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <div>
            <p className="critiqueCount">
              {session.joinedCount} / {session.occupantCount}
            </p>
            <p className="critiqueHint">
              {allIn
                ? "Toda la sala escaneó. Empezá la puntuación."
                : "Que cada uno apunte el QR con el teléfono."}
            </p>
            <ul className="critiqueNames">
              {ready.map((row) => (
                <li className="isIn" key={row.personId}>
                  {row.name}
                </li>
              ))}
              {waiting.map((row) => (
                <li key={row.personId}>{row.name}</li>
              ))}
            </ul>
            <form action={startAction}>
              <input name="screeningId" type="hidden" value={session.screeningId} />
              <button className="primaryButton" disabled={starting || session.joinedCount === 0} type="submit">
                {starting ? "Abriendo…" : "Empezar puntuación"}
              </button>
            </form>
            {startState.error ? <p className="formError">{startState.error}</p> : null}
            <p className="critiqueUrl">{scoreUrl}</p>
          </div>
        </div>
      ) : (
        <div className="critiqueLive">
          <p className="critiqueAverage">{session.roomAverage == null ? "—" : session.roomAverage.toFixed(1)}</p>
          <p className="critiqueHint">
            {session.status === "closed"
              ? "Puntaje final de la sala."
              : `${session.submittedCount} de ${session.joinedCount} ya puntuaron.`}
          </p>
          {session.categoryAverages ? (
            <div className="critiqueBars">
              {CRITIQUE_CATEGORIES.map((category) => (
                <div className="critiqueBar" key={category.id}>
                  <span>{category.label}</span>
                  <i>
                    <b style={{ width: `${(session.categoryAverages?.[category.id] ?? 0) * 10}%` }} />
                  </i>
                  <em>{(session.categoryAverages?.[category.id] ?? 0).toFixed(1)}</em>
                </div>
              ))}
            </div>
          ) : null}
          <ul className="critiqueNames">
            {submitted.map((row) => (
              <li className="isIn" key={row.personId}>
                {row.name}
                {row.average != null ? <b>{row.average.toFixed(1)}</b> : null}
              </li>
            ))}
            {ready
              .filter((row) => !row.submitted)
              .map((row) => (
                <li key={row.personId}>{row.name}</li>
              ))}
          </ul>
          {session.status === "scoring" ? (
            <form action={closeAction}>
              <input name="screeningId" type="hidden" value={session.screeningId} />
              <button className="primaryButton" disabled={closing || session.submittedCount === 0} type="submit">
                {closing ? "Cerrando…" : "Cerrar y publicar"}
              </button>
            </form>
          ) : (
            <a className="textButton" href="/historial">
              Ver historial
            </a>
          )}
          {closeState.error ? <p className="formError">{closeState.error}</p> : null}
        </div>
      )}
    </section>
  );
}
