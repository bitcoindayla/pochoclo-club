"use client";

import {
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

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

function voteCount(ballot: MemberMovieBallot, movieId: string) {
  return ballot.counts[movieId] ?? 0;
}

function voteShare(ballot: MemberMovieBallot, movieId: string) {
  const count = voteCount(ballot, movieId);
  return ballot.voterCount ? Math.round((count / ballot.voterCount) * 100) : 0;
}

function voteTone(percentage: number, peak: number) {
  const t = peak > 0 ? percentage / peak : 0;
  return {
    channel: Math.round(150 + t * 105),
    gain: Number((0.36 + t * 0.64).toFixed(3)),
  };
}

function useCountUp(target: number, delayMs: number) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    let frame = 0;
    const startedAt = performance.now() + delayMs;
    const duration = 980;
    const tick = (now: number) => {
      if (now < startedAt) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [delayMs, target]);

  return value;
}

function VoteScore({
  count,
  delay,
  percentage,
}: {
  count: number;
  delay: number;
  percentage: number;
}) {
  const votes = useCountUp(count, delay);
  const share = useCountUp(percentage, delay);

  return (
    <span
      className="cinematicVoteScore"
      aria-label={`${count} ${count === 1 ? "voto" : "votos"}, ${percentage} por ciento`}
    >
      <b>{votes}</b>
      <i>{share}</i>
    </span>
  );
}

function MovieTitleBlock({
  delay,
  movie,
  percentage,
  showResults,
  tone,
  votes,
}: {
  delay: number;
  movie: MovieOption;
  percentage: number;
  showResults: boolean;
  tone: { channel: number; gain: number };
  votes: number;
}) {
  const blockRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [titleClear, setTitleClear] = useState(0);

  useLayoutEffect(() => {
    if (!showResults) return;
    const block = blockRef.current;
    const title = titleRef.current;
    if (!block || !title) return;

    const update = () => {
      setTitleClear(Math.ceil(title.getBoundingClientRect().width));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(title);
    observer.observe(block);
    return () => observer.disconnect();
  }, [movie.title, showResults]);

  return (
    <span
      className="cinematicTitleBlock"
      ref={blockRef}
      style={
        showResults
          ? ({
              "--vote-pct": percentage <= 0 ? "3.1rem" : `${percentage}%`,
              "--title-clear": `${titleClear}px`,
              "--bar-delay": `${delay}ms`,
              "--vote-rgb": `${tone.channel}, ${tone.channel}, ${tone.channel}`,
              "--vote-gain": String(tone.gain),
              "--bar-noise": `${delay / 8}px ${delay / 13}px`,
            } as CSSProperties)
          : undefined
      }
    >
      {showResults ? (
        <span className="cinematicVoteTrack" aria-hidden="true">
          <span className="cinematicVoteGrow">
            <i className="cinematicVoteBar" />
          </span>
        </span>
      ) : null}
      <span className="cinematicMovieTitle" ref={titleRef}>
        {movie.title}
      </span>
      {showResults ? <VoteScore count={votes} delay={delay} percentage={percentage} /> : null}
      <small>
        {movie.year} <i>|</i> {movie.director}
      </small>
    </span>
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
  const showResults = ballot.showResults;
  const peak = showResults
    ? Math.max(0, ...ballot.options.map((movie) => voteShare(ballot, movie.id)))
    : 0;

  return (
    <div className={showResults ? "cinematicTitles hasResults" : "cinematicTitles"}>
      {ballot.options.map((movie, index) => {
        const percentage = voteShare(ballot, movie.id);
        const votes = voteCount(ballot, movie.id);
        const tone = voteTone(percentage, peak);
        const title = (
          <>
            <span className="cinematicSelectionMark" aria-hidden="true" />
            <MovieTitleBlock
              delay={index * 90}
              movie={movie}
              percentage={percentage}
              showResults={showResults}
              tone={tone}
              votes={votes}
            />
          </>
        );
        const className = [
          index === activeIndex ? "isActive" : "",
          showResults ? "hasResults" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return canVote ? (
          <label
            className={className}
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
            className={className}
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

function SeatAccessCue({
  canAccessSeats,
  hasSeat,
  justSaved,
  onOpenChange,
  screeningId,
}: {
  canAccessSeats: boolean;
  hasSeat: boolean;
  justSaved: boolean;
  onOpenChange?: (open: boolean) => void;
  screeningId: string;
}) {
  const storageKey = `pochoclo-seat-cue:${screeningId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const shouldShow = canAccessSeats && !hasSeat;
    setOpen(shouldShow);
    onOpenChange?.(shouldShow);
  }, [canAccessSeats, hasSeat, onOpenChange]);

  function dismiss() {
    setOpen(false);
    onOpenChange?.(false);
    try {
      sessionStorage.setItem(storageKey, "seen");
    } catch {
      /* ignore private-mode storage */
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, storageKey]);

  const arrow = (
    <i aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M5 9.5 12 16.5 19 9.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      </svg>
    </i>
  );

  if (!open) return null;

  return (
    <a className="cinematicSeatCue" href="#sala" onClick={dismiss}>
      <strong>
        <span>Asegurá</span>
        <span>tu lugar</span>
      </strong>
      {arrow}
    </a>
  );
}

export function MovieBallotPanel({
  ballot,
  hasSeat = false,
}: {
  ballot: MemberMovieBallot;
  hasSeat?: boolean;
}) {
  const [state, action, pending] = useActionState(submitMovieVoteAction, initialState);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const canVote = ballot.status === "open";
  const activeMovie = ballot.options[activeIndex] ?? ballot.options[0];
  const accent = activeMovie?.image?.accent || fallbackAccents[activeIndex % fallbackAccents.length];
  const [seatCueOpen, setSeatCueOpen] = useState(false);
  const showSeatCue = seatCueOpen || (Boolean(state.message) && ballot.canAccessSeats && !hasSeat);

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
      <div className="cinematicMain">
        <div>
          <p className="cinematicInstruction">
            {canVote
              ? `Elegí una, varias o todas las películas. Cierra el ${formatClose(ballot.closesAt)}.`
              : "Votación cerrada. Estos fueron los títulos de la cartelera."}
            {ballot.showResults ? (
              <span className="cinematicVoteTotal">
                {ballot.voterCount} voto{ballot.voterCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
          <MovieTitles
            activeIndex={activeIndex}
            ballot={ballot}
            canVote={canVote}
            onActivate={setActiveIndex}
          />
          {ballot.showResults && ballot.winnerOptionId ? (
            <p className="cinematicWinnerNote">
              La elegida fue{" "}
              <strong>
                {ballot.options.find((option) => option.id === ballot.winnerOptionId)?.title}
              </strong>
              .
            </p>
          ) : ballot.showResults && ballot.status === "decision" ? (
            <p className="cinematicWinnerNote">
              Hubo un empate. El administrador va a elegir la ganadora.
            </p>
          ) : null}
        </div>
      </div>

      <div className="cinematicBottomline">
        <div className="cinematicBottomCopy">
          <div className="cinematicSynopsis">
            <span>{String(activeIndex + 1).padStart(2, "0")} / {String(ballot.options.length).padStart(2, "0")}</span>
            <p>{activeMovie?.bio}</p>
          </div>
          {!ballot.showResults ? (
            <p className="cinematicResultsLocked">Los resultados aparecen después de guardar tu voto.</p>
          ) : null}
          {state.error ? <p className="cinematicFeedback isError" role="alert">{state.error}</p> : null}
          {state.message ? (
            <p className={showSeatCue ? "srOnly" : "cinematicFeedback"} role="status">
              {state.message}
            </p>
          ) : null}
          {ballot.hasExemption && !ballot.hasVoted ? (
            <p className="cinematicFeedback">Tenés una excepción y podés reservar sin votar.</p>
          ) : null}
        </div>
        <SeatAccessCue
          canAccessSeats={ballot.canAccessSeats}
          hasSeat={hasSeat}
          justSaved={Boolean(state.message)}
          onOpenChange={setSeatCueOpen}
          screeningId={ballot.screeningId}
        />
        {canVote ? (
          <button className="cinematicVoteButton" disabled={pending} type="submit">
            {pending ? "Guardando…" : ballot.hasVoted ? "Actualizar voto" : "Confirmar selección"}
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <section
      className={[
        "cinematicBallot",
        ballot.canAccessSeats ? "hasSeatHint" : "",
        showSeatCue ? "hasSeatCue" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--cinematic-accent": accent } as CSSProperties}
      id="cartelera"
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
      {ballot.canAccessSeats && !seatCueOpen ? (
        <a className="cinematicScrollHint" href="#sala">
          <span className="srOnly">Bajá a elegir tu lugar</span>
          <i aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 9.5 12 16.5 19 9.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.4"
              />
            </svg>
          </i>
        </a>
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
