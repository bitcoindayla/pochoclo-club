"use client";

import { useActionState, useEffect, useState } from "react";

import type { MemberMovieBallot, MovieOption } from "@/lib/movie-voting";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";

import {
  submitMovieVoteAction,
  type MovieVoteActionState,
} from "./movie-actions";

const initialState: MovieVoteActionState = { error: null, message: null };
const fallbackAccents = ["#ff5538", "#00c7d9", "#dbff4d", "#ff66a8", "#8b73ff"];

function formatClose(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLUB_TIME_ZONE,
  }).format(date);
}

function imageUrl(ballot: MemberMovieBallot, movie: MovieOption, variant: "landscape" | "portrait") {
  const version = variant === "portrait"
    ? movie.image?.portraitPath
    : movie.image?.landscapePath;
  const suffix = version ? `?v=${encodeURIComponent(version)}` : "";
  return `/api/movie-images/${ballot.screeningId}/${movie.id}/${variant}${suffix}`;
}

function BallotBackdrop({
  activeIndex,
  ballot,
}: {
  activeIndex: number;
  ballot: MemberMovieBallot;
}) {
  return (
    <div className="cinematicBackdrops" aria-hidden="true">
      {ballot.options.map((movie, index) => (
        <div
          className={`cinematicBackdrop cinematicFallback-${index + 1}${index === activeIndex ? " isActive" : ""}`}
          key={movie.id}
        >
          {movie.image ? (
            <picture>
              <source
                media="(max-width: 700px)"
                srcSet={imageUrl(ballot, movie, "portrait")}
              />
              <img alt="" src={imageUrl(ballot, movie, "landscape")} />
            </picture>
          ) : null}
        </div>
      ))}
      <div className="cinematicShade" />
      <div className="cinematicGrain" />
    </div>
  );
}

function BallotResults({ ballot }: { ballot: MemberMovieBallot }) {
  const winner = ballot.options.find((option) => option.id === ballot.winnerOptionId);
  return (
    <aside className="cinematicResults" aria-label="Resultados de la votación">
      <div className="cinematicResultsHeading">
        <strong>Resultados</strong>
        <span>{ballot.voterCount} votante{ballot.voterCount === 1 ? "" : "s"}</span>
      </div>
      {ballot.options.map((movie) => {
        const count = ballot.counts[movie.id] ?? 0;
        const percentage = ballot.voterCount
          ? Math.round((count / ballot.voterCount) * 100)
          : 0;
        return (
          <div className="cinematicResult" key={movie.id}>
            <div>
              <span>{movie.title}</span>
              <b>{percentage}%</b>
            </div>
            <i aria-hidden="true"><span style={{ width: `${percentage}%` }} /></i>
          </div>
        );
      })}
      {winner ? (
        <p>La elegida fue <strong>{winner.title}</strong>.</p>
      ) : ballot.status === "decision" ? (
        <p>Hubo un empate. El administrador va a elegir la ganadora.</p>
      ) : null}
    </aside>
  );
}

function MovieTitles({
  activeIndex,
  ballot,
  canVote,
  onActivate,
}: {
  activeIndex: number;
  ballot: MemberMovieBallot;
  canVote: boolean;
  onActivate: (index: number) => void;
}) {
  return (
    <div className="cinematicTitles">
      {ballot.options.map((movie, index) => {
        const title = (
          <>
            <span className="cinematicSelectionMark" aria-hidden="true" />
            <span className="cinematicMovieTitle">{movie.title}</span>
            <small>{movie.year} <i>|</i> {movie.director}</small>
          </>
        );
        return canVote ? (
          <label
            className={index === activeIndex ? "isActive" : ""}
            key={movie.id}
            onFocus={() => onActivate(index)}
            onMouseEnter={() => onActivate(index)}
          >
            <input
              defaultChecked={ballot.selection.includes(movie.id)}
              name="optionId"
              type="checkbox"
              value={movie.id}
            />
            {title}
          </label>
        ) : (
          <button
            className={index === activeIndex ? "isActive" : ""}
            key={movie.id}
            onFocus={() => onActivate(index)}
            onMouseEnter={() => onActivate(index)}
            onClick={() => onActivate(index)}
            type="button"
          >
            {title}
          </button>
        );
      })}
    </div>
  );
}

export function MovieBallotPanel({ ballot }: { ballot: MemberMovieBallot }) {
  const [state, action, pending] = useActionState(submitMovieVoteAction, initialState);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const canVote = ballot.status === "open";
  const activeMovie = ballot.options[activeIndex] ?? ballot.options[0];
  const accent = activeMovie?.image?.accent || fallbackAccents[activeIndex % fallbackAccents.length];

  useEffect(() => {
    if (
      isInteracting ||
      ballot.options.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % ballot.options.length);
    }, 5_500);
    return () => window.clearInterval(timer);
  }, [ballot.options.length, isInteracting]);

  if (ballot.status === "canceled") {
    return (
      <section className="memberBallot memberBallotCanceled" aria-labelledby="cartelera-title">
        <p className="kicker">La cartelera</p>
        <h2 id="cartelera-title">La votación fue cancelada</h2>
        <p>Esta quedó como una función especial. Podés elegir tu lugar normalmente.</p>
      </section>
    );
  }

  const content = (
    <>
      <div className="cinematicTopline">
        <span className="cinematicMenu">La cartelera</span>
        <strong className="cinematicWordmark">Pochoclo <i>Club</i></strong>
        <span className="cinematicStatus">
          {canVote ? `Cierra el ${formatClose(ballot.closesAt)}` : "Votación cerrada"}
        </span>
      </div>

      <div className="cinematicMain">
        <div>
          <p className="cinematicInstruction">
            {canVote
              ? "Elegí una, varias o todas las películas."
              : "Estos fueron los títulos de la cartelera."}
          </p>
          <MovieTitles
            activeIndex={activeIndex}
            ballot={ballot}
            canVote={canVote}
            onActivate={setActiveIndex}
          />
        </div>
        {ballot.showResults ? <BallotResults ballot={ballot} /> : null}
      </div>

      <div className="cinematicBottomline">
        <div className="cinematicSynopsis">
          <span>{String(activeIndex + 1).padStart(2, "0")} / {String(ballot.options.length).padStart(2, "0")}</span>
          <p>{activeMovie?.bio}</p>
        </div>
        {canVote ? (
          <button className="cinematicVoteButton" disabled={pending} type="submit">
            {pending ? "Guardando…" : ballot.hasVoted ? "Actualizar voto" : "Confirmar selección"}
          </button>
        ) : null}
      </div>
      {state.error ? <p className="cinematicFeedback isError" role="alert">{state.error}</p> : null}
      {state.message ? <p className="cinematicFeedback" role="status">{state.message}</p> : null}
      {!ballot.showResults ? (
        <p className="cinematicResultsLocked">Los resultados aparecen después de guardar tu voto.</p>
      ) : null}
      {ballot.hasExemption && !ballot.hasVoted ? (
        <p className="cinematicFeedback">Tenés una excepción y podés reservar sin votar.</p>
      ) : null}
    </>
  );

  return (
    <section
      className="cinematicBallot"
      style={{ "--cinematic-accent": accent } as React.CSSProperties}
      aria-labelledby="cartelera-title"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
    >
      <h2 className="srOnly" id="cartelera-title">La cartelera</h2>
      <BallotBackdrop activeIndex={activeIndex} ballot={ballot} />
      {canVote ? (
        <form action={action} className="cinematicContent">
          <input name="screeningId" type="hidden" value={ballot.screeningId} />
          {content}
        </form>
      ) : (
        <div className="cinematicContent">{content}</div>
      )}
    </section>
  );
}

export function LatestWinner({ movie }: { movie: MovieOption }) {
  return (
    <section className="latestWinner">
      <div>
        <p className="kicker">Última ganadora</p>
        <h2>{movie.title}</h2>
      </div>
      <p>{movie.year} · {movie.director}</p>
    </section>
  );
}
