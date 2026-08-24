"use client";

import { useActionState, useEffect, useState } from "react";

import { CRITIQUE_CATEGORIES, type CritiqueCategoryId } from "@/lib/critique-policy";

import { joinCritiqueAction, submitScoresAction, type PhoneCritiqueState } from "./actions";

const initial: PhoneCritiqueState = { error: null, message: null };

type PhoneSnapshot = {
  status: "lobby" | "scoring" | "closed";
  movieTitle: string;
  movieYear: number;
  movieDirector: string;
  occupantCount: number;
  joinedCount: number;
  roomAverage: number | null;
  me: { personId: string; name: string; joined: boolean; submitted: boolean; average: number | null } | null;
  names: { personId: string; name: string; joined: boolean }[];
};

export function CritiquePhone({
  token,
  initialData,
}: {
  token: string;
  initialData: PhoneSnapshot;
}) {
  const [data, setData] = useState(initialData);
  const [joinState, joinAction, joining] = useActionState(joinCritiqueAction, initial);
  const [scoreState, scoreAction, sending] = useActionState(submitScoresAction, initial);
  const [scores, setScores] = useState<Partial<Record<CritiqueCategoryId, number>>>({});

  async function refresh() {
    const response = await fetch(`/api/critique/phone?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!response.ok) return;
    setData((await response.json()) as PhoneSnapshot);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [token]);

  useEffect(() => {
    if (joinState.message || scoreState.message) void refresh();
  }, [joinState.message, scoreState.message, token]);

  const filled = CRITIQUE_CATEGORIES.every((category) => typeof scores[category.id] === "number");
  const average = filled
    ? Math.round(
        (CRITIQUE_CATEGORIES.reduce((sum, category) => sum + (scores[category.id] ?? 0), 0) /
          CRITIQUE_CATEGORIES.length) *
          10,
      ) / 10
    : null;

  return (
    <section className="critiquePhone">
      <p className="kicker">La crítica</p>
      <h1>
        {data.movieTitle}
        <small>
          {data.movieYear} · {data.movieDirector}
        </small>
      </h1>

      {!data.me ? (
        <form action={joinAction} className="critiqueJoin">
          <input name="token" type="hidden" value={token} />
          <p className="critiqueHint">¿Quién sos en la sala de hoy?</p>
          <div className="critiquePick">
            {data.names
              .filter((row) => !row.joined)
              .map((row) => (
                <label key={row.personId}>
                  <input name="personId" type="radio" value={row.personId} required />
                  <span>{row.name}</span>
                </label>
              ))}
          </div>
          <button className="primaryButton" disabled={joining} type="submit">
            {joining ? "Entrando…" : "Entrar a la crítica"}
          </button>
          {joinState.error ? <p className="formError">{joinState.error}</p> : null}
        </form>
      ) : data.status === "lobby" ? (
        <div className="critiqueWait">
          <p className="critiqueCount">
            {data.joinedCount} / {data.occupantCount}
          </p>
          <p className="critiqueHint">Esperá. La puntuación empieza cuando toda la sala escaneó.</p>
          <p>Entraste como {data.me.name}.</p>
        </div>
      ) : data.status === "closed" ? (
        <div className="critiqueWait">
          <p className="critiqueAverage">{data.roomAverage == null ? "—" : data.roomAverage.toFixed(1)}</p>
          <p className="critiqueHint">Sala cerrada. Ese es el puntaje final.</p>
        </div>
      ) : (
        <form action={scoreAction} className="critiqueForm">
          <input name="token" type="hidden" value={token} />
          <input name="personId" type="hidden" value={data.me.personId} />
          <p className="critiqueHint">Cinco notas, del 0 al 10. Sin texto.</p>
          {average != null ? <p className="critiqueAverage">{average.toFixed(1)}</p> : null}
          {CRITIQUE_CATEGORIES.map((category) => (
            <fieldset className="critiqueScale" key={category.id}>
              <legend>{category.label}</legend>
              <div>
                {Array.from({ length: 11 }, (_, score) => (
                  <label key={score}>
                    <input
                      checked={scores[category.id] === score}
                      name={category.id}
                      onChange={() => setScores((current) => ({ ...current, [category.id]: score }))}
                      type="radio"
                      value={score}
                      required
                    />
                    <span>{score}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button className="primaryButton" disabled={sending || !filled} type="submit">
            {sending ? "Enviando…" : data.me.submitted ? "Actualizar puntaje" : "Enviar puntaje"}
          </button>
          {scoreState.error ? <p className="formError">{scoreState.error}</p> : null}
          {scoreState.message ? <p className="formSuccess">{scoreState.message}</p> : null}
        </form>
      )}
    </section>
  );
}
