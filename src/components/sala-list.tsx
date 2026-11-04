"use client";

import { useState } from "react";

import { toggleSalaListVoteAction } from "@/app/actions/sala-list";
import { SalaListMark } from "@/components/sala-list-marks";
import { SALA_LIST, SALA_LIST_THANKS, salaListCopy } from "@/lib/sala-list-policy";

export function SalaList({
  counts,
  votedIds,
}: {
  counts: Record<string, number>;
  votedIds: string[];
}) {
  const [voted, setVoted] = useState(() => new Set(votedIds));
  const [tally, setTally] = useState(counts);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  async function toggle(filmId: string) {
    if (pending.has(filmId)) return;
    const was = voted.has(filmId);
    setError(null);
    setVoted((current) => {
      const next = new Set(current);
      if (was) next.delete(filmId);
      else next.add(filmId);
      return next;
    });
    setTally((current) => ({
      ...current,
      [filmId]: Math.max(0, (current[filmId] ?? 0) + (was ? -1 : 1)),
    }));
    setPending((current) => new Set(current).add(filmId));
    try {
      const result = await toggleSalaListVoteAction(filmId);
      if (result.error || !result.filmId) {
        setVoted((current) => {
          const next = new Set(current);
          if (was) next.add(filmId);
          else next.delete(filmId);
          return next;
        });
        setTally((current) => ({
          ...current,
          [filmId]: Math.max(0, (current[filmId] ?? 0) + (was ? 1 : -1)),
        }));
        setError(result.error ?? "No pudimos anotar el voto.");
        return;
      }
      setVoted((current) => {
        const next = new Set(current);
        if (result.voted) next.add(result.filmId!);
        else next.delete(result.filmId!);
        return next;
      });
      setTally((current) => ({ ...current, [result.filmId!]: result.count ?? 0 }));
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(filmId);
        return next;
      });
    }
  }

  return (
    <section className="salaList">
      <header className="salaIntro">
        <p className="kicker">Cincuenta pendientes</p>
        <h1>La lista que pide sala</h1>
        <p>
          Pelis que el club todavía no proyectó. Tocá las que te queman ver, o volver a ver.
          Las que más votos junten, piden un domingo.
        </p>
        <p className="salaPulse">{error ?? salaListCopy(voted.size)}</p>
      </header>
      <ol className="salaRows">
        {SALA_LIST.map((film, index) => {
          const isVoted = voted.has(film.id);
          const count = tally[film.id] ?? 0;
          const busy = pending.has(film.id);
          return (
            <li key={film.id}>
              <button
                className={`salaRow${isVoted ? " isVoted" : ""}${busy ? " isPending" : ""}`}
                type="button"
                aria-pressed={isVoted}
                aria-busy={busy}
                aria-label={`${film.title}. ${count} ${count === 1 ? "voto" : "votos"}.`}
                onClick={() => toggle(film.id)}
              >
                <span className="salaIndex">{String(index + 1).padStart(2, "0")}</span>
                <SalaListMark id={film.id} voted={isVoted} />
                <span className="salaBody">
                  <strong className="salaTitle">{film.title}</strong>
                  <span className="salaCredit">
                    {film.year} · {film.director}
                  </span>
                  <span className="salaBio">{film.bio}</span>
                </span>
                <span className="salaCount">{count}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <footer className="salaThanks">
        <img
          alt=""
          className="salaThanksBear"
          height={56}
          src="/brand/pochoclo-oso.png"
          width={56}
        />
        <p>{SALA_LIST_THANKS}</p>
      </footer>
    </section>
  );
}
