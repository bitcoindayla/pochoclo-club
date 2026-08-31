"use client";

import { useActionState, useEffect, useState } from "react";

import {
  CRITIQUE_CATEGORIES,
  SCORE_ANCHORS,
  SCORE_SCALE_LEGEND,
} from "@/lib/critique-policy";
import type { CritiqueSession } from "@/lib/critiques";

import {
  closeCritiqueAction,
  releaseAudienceAction,
  startScoringAction,
  type CritiqueActionState,
} from "./actions";

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
  const [releaseState, releaseAction, releasing] = useActionState(releaseAudienceAction, initial);

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
  const pending = ready.filter((row) => !row.submitted);
  const submitted = session.audience.filter((row) => row.submitted);
  const allIn = session.joinedCount >= session.occupantCount && session.occupantCount > 0;
  const canRelease = session.status !== "closed";

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
            <AudienceList
              action={releaseAction}
              canRelease={canRelease}
              pending={releasing}
              screeningId={session.screeningId}
              waiting={waiting}
              ready={ready}
              submitted={submitted}
            />
            <form action={startAction}>
              <input name="screeningId" type="hidden" value={session.screeningId} />
              <button className="primaryButton" disabled={starting || session.joinedCount === 0} type="submit">
                {starting ? "Abriendo…" : "Empezar puntuación"}
              </button>
            </form>
            {startState.error ? <p className="formError">{startState.error}</p> : null}
            {releaseState.error ? <p className="formError">{releaseState.error}</p> : null}
            {releaseState.message ? <p className="formSuccess">{releaseState.message}</p> : null}
            <p className="critiqueUrl">{scoreUrl}</p>
          </div>
        </div>
      ) : (
        <div className="critiqueLive">
          <div className="critiqueLiveHead">
            <p className="critiqueAverage">{session.roomAverage == null ? "—" : session.roomAverage.toFixed(1)}</p>
            <div>
              <p className="critiqueTally">
                <b>{String(session.submittedCount).padStart(2, "0")}</b>
                <span>/ {String(session.occupantCount).padStart(2, "0")}</span>
              </p>
              <p className="critiqueHint">
                {session.status === "closed"
                  ? "Puntaje final de la sala."
                  : pending.length === 0
                    ? "Toda la sala ya puntuó."
                    : `${pending.length} todavía en el teléfono.`}
              </p>
              <p className="critiqueScaleLegend">{SCORE_SCALE_LEGEND}</p>
            </div>
          </div>
          {session.categoryAverages ? (
            <div className="critiqueBars">
              {CRITIQUE_CATEGORIES.map((category) => {
                const value = session.categoryAverages?.[category.id] ?? 0;
                return (
                  <div className="critiqueBar" key={category.id}>
                    <span>
                      {category.label}
                      <small>{category.hint}</small>
                    </span>
                    <i>
                      {SCORE_ANCHORS.map((anchor) => (
                        <em
                          aria-hidden="true"
                          className={anchor.score >= 8 ? "isHot" : undefined}
                          key={anchor.score}
                          style={{ left: `${anchor.score * 10}%` }}
                        />
                      ))}
                      <b style={{ width: `${value * 10}%` }} />
                    </i>
                    <strong>{value.toFixed(1)}</strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="critiqueHint">El promedio aparece con la primera nota.</p>
          )}
          <AudienceList
            action={releaseAction}
            canRelease={canRelease}
            pending={releasing}
            screeningId={session.screeningId}
            waiting={waiting}
            ready={ready}
            submitted={submitted}
          />
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
          {releaseState.error ? <p className="formError">{releaseState.error}</p> : null}
          {releaseState.message ? <p className="formSuccess">{releaseState.message}</p> : null}
        </div>
      )}
    </section>
  );
}

function AudienceList({
  action,
  canRelease,
  pending,
  ready,
  screeningId,
  submitted,
  waiting,
}: {
  action: (payload: FormData) => void;
  canRelease: boolean;
  pending: boolean;
  ready: CritiqueSession["audience"];
  screeningId: string;
  submitted: CritiqueSession["audience"];
  waiting: CritiqueSession["audience"];
}) {
  const rows = [...submitted, ...ready.filter((row) => !row.submitted), ...waiting];
  return (
    <ul className="critiqueRoster">
      {rows.map((row) => (
        <li className={row.submitted ? "isIn" : row.joined ? "isReady" : undefined} key={row.personId}>
          <span>
            {row.name}
            {row.average != null ? <b>{row.average.toFixed(1)}</b> : null}
          </span>
          <small>
            {row.submitted ? "Envió" : row.joined ? "En el teléfono" : "Sin escanear"}
          </small>
          {canRelease && row.joined ? (
            <form action={action}>
              <input name="screeningId" type="hidden" value={screeningId} />
              <input name="personId" type="hidden" value={row.personId} />
              <button disabled={pending} type="submit">
                Reabrir
              </button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
