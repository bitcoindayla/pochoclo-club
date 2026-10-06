"use client";

import { useEffect, useMemo, useState } from "react";

import {
  defaultFeaturedId,
  formatCountdown,
  rankPreludeFilms,
  remainingToStart,
  type PreludeFilm,
} from "@/lib/screening-prelude-policy";

export function ScreeningPrelude({
  startsAt,
  localTime,
  nightTitle,
  films,
}: {
  startsAt: string;
  localTime: string;
  nightTitle: string | null;
  films: PreludeFilm[];
}) {
  const ranked = useMemo(() => rankPreludeFilms(films), [films]);
  const [featuredId, setFeaturedId] = useState(() => defaultFeaturedId(films, nightTitle));
  const [now, setNow] = useState(() => Date.now());
  const [stillError, setStillError] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const featured = films.find((film) => film.id === featuredId) ?? ranked[0] ?? null;
  const countdown = remainingToStart(new Date(startsAt), new Date(now));

  if (!featured) return null;

  return (
    <section className="screeningPrelude">
      {featured.stillUrl && !stillError ? (
        // Auth-gated still of tonight's ballot; the TV browser is already signed in.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="preludeStill"
          decoding="async"
          key={featured.stillUrl}
          onError={() => setStillError(true)}
          src={featured.stillUrl}
        />
      ) : (
        <div className="preludeStill isEmpty" />
      )}
      <div className="preludeScrim" />
      <div className="preludeMain">
        <div className="preludeCopy">
          <p className="kicker">{nightTitle || "Esta noche"}</p>
          <h1>
            {featured.title}
            <small>
              {featured.year} · {featured.director}
            </small>
          </h1>
          {featured.bio ? <p className="preludeBio">{featured.bio}</p> : null}
        </div>
        <p className="preludeTimer" aria-live="polite">
          {countdown.started ? (
            <>
              <b>En sala</b>
              <small>La función ya empezó · {localTime}</small>
            </>
          ) : (
            <>
              <b>{formatCountdown(countdown)}</b>
              <small>Arranca a las {localTime}</small>
            </>
          )}
        </p>
      </div>
      {ranked.length > 1 ? (
        <ol className="preludeBallot">
          {ranked.map((film) => (
            <li key={film.id}>
              <button
                aria-pressed={film.id === featured.id}
                className={film.id === featured.id ? "isFeatured" : undefined}
                onClick={() => {
                  setStillError(false);
                  setFeaturedId(film.id);
                }}
                type="button"
              >
                <strong>{String(film.votes).padStart(2, "0")}</strong>
                <span>
                  {film.title}
                  <small>
                    {film.director} · {film.year}
                    {film.isWinner ? " · votación" : ""}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
