"use client";

import { useActionState } from "react";

import type { MemberMovieBallot, MovieOption } from "@/lib/movie-voting";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";

import {
  submitMovieVoteAction,
  type MovieVoteActionState,
} from "./movie-actions";

const initialState: MovieVoteActionState = { error: null, message: null };

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

function BallotResults({ ballot }: { ballot: MemberMovieBallot }) {
  const winner = ballot.options.find((option) => option.id === ballot.winnerOptionId);
  return (
    <div className="memberBallotResults">
      <div className="ballotResultsHeading">
        <h3>Resultados</h3>
        <span>{ballot.voterCount} votante{ballot.voterCount === 1 ? "" : "s"}</span>
      </div>
      {ballot.options.map((movie) => {
        const count = ballot.counts[movie.id] ?? 0;
        const percentage = ballot.voterCount
          ? Math.round((count / ballot.voterCount) * 100)
          : 0;
        return (
          <div
            className={movie.id === ballot.winnerOptionId ? "memberResultBar winnerResult" : "memberResultBar"}
            key={movie.id}
          >
            <div>
              <strong>{movie.title}</strong>
              <span>{count} voto{count === 1 ? "" : "s"} · {percentage}%</span>
            </div>
            <i aria-hidden="true" style={{ width: `${percentage}%` }} />
          </div>
        );
      })}
      {winner ? (
        <p className="winnerNotice">La elegida fue <strong>{winner.title}</strong>.</p>
      ) : ballot.status === "decision" ? (
        <p className="closedNotice">Hubo un empate. El administrador va a elegir la ganadora.</p>
      ) : null}
    </div>
  );
}

export function MovieBallotPanel({ ballot }: { ballot: MemberMovieBallot }) {
  const [state, action, pending] = useActionState(submitMovieVoteAction, initialState);
  const canVote = ballot.status === "open";

  if (ballot.status === "canceled") {
    return (
      <section className="memberBallot" aria-labelledby="cartelera-title">
        <div className="memberBallotHeader">
          <div>
            <p className="kicker">La cartelera</p>
            <h2 id="cartelera-title">La votación fue cancelada</h2>
            <p>Esta quedó como una función especial. Podés elegir tu lugar normalmente.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="memberBallot" aria-labelledby="cartelera-title">
      <div className="memberBallotHeader">
        <div>
          <p className="kicker">La cartelera</p>
          <h2 id="cartelera-title">
            {canVote ? "¿Qué películas querés ver?" : "La votación cerró"}
          </h2>
          <p>
            {canVote
              ? `Podés elegir una, varias o todas. Tenés tiempo hasta el ${formatClose(ballot.closesAt)}.`
              : `La votación cerró el ${formatClose(ballot.closesAt)}.`}
          </p>
        </div>
        {ballot.hasVoted ? <span className="votedBadge">Ya votaste</span> : null}
      </div>

      {canVote ? (
        <form action={action} className="memberVoteForm">
          <input name="screeningId" type="hidden" value={ballot.screeningId} />
          <div className="memberMovieGrid">
            {ballot.options.map((movie) => (
              <label className="memberMovieOption" key={movie.id}>
                <input
                  defaultChecked={ballot.selection.includes(movie.id)}
                  name="optionId"
                  type="checkbox"
                  value={movie.id}
                />
                <span className="movieCheck" aria-hidden="true">✓</span>
                <span className="movieCopy">
                  <strong>{movie.title}</strong>
                  <small>{movie.year} · {movie.director}</small>
                  <p>{movie.bio}</p>
                </span>
              </label>
            ))}
          </div>
          <div className="voteControls">
            <p>Elegí por lo menos una película.</p>
            <button className="primaryButton" disabled={pending} type="submit">
              {pending ? "Guardando…" : ballot.hasVoted ? "Actualizar mi voto" : "Guardar mi voto"}
            </button>
          </div>
          {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
          {state.message ? <p className="formSuccess" role="status">{state.message}</p> : null}
        </form>
      ) : (
        <div className="closedMovieList">
          {ballot.options.map((movie) => (
            <article key={movie.id}>
              <h3>{movie.title}</h3>
              <p>{movie.year} · {movie.director}</p>
              <small>{movie.bio}</small>
            </article>
          ))}
        </div>
      )}

      {ballot.showResults ? <BallotResults ballot={ballot} /> : (
        <p className="resultsLocked">Los resultados aparecen después de guardar tu voto.</p>
      )}

      {ballot.hasExemption && !ballot.hasVoted ? (
        <p className="exemptionNotice">Tenés una excepción del administrador y podés reservar sin votar.</p>
      ) : null}
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
