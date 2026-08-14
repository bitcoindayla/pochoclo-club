"use client";

import { useEffect, useRef } from "react";

import type { MovieOptionInput } from "@/lib/movie-voting-policy";
import { placeDisplayLabel } from "@/lib/room";

function movieStill(screeningId: string, movie: MovieOptionInput) {
  if (!movie.image) return null;
  return `/api/movie-images/${screeningId}/${movie.id}/portrait?v=${encodeURIComponent(movie.image.portraitPath)}`;
}

function FakeQr({ seed, accent }: { seed: string; accent: string }) {
  const bits = [];
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  for (let row = 0; row < 13; row += 1) {
    for (let col = 0; col < 13; col += 1) {
      const finder =
        (row < 3 && col < 3) ||
        (row < 3 && col > 9) ||
        (row > 9 && col < 3);
      const value = finder || ((hash + row * 17 + col * 13) % 5 > 1);
      bits.push(
        <i
          className={value ? "isOn" : undefined}
          key={`${row}-${col}`}
          style={{ gridColumn: col + 1, gridRow: row + 1 }}
        />,
      );
    }
  }
  return (
    <div className="ticketQr" aria-hidden="true" style={{ background: accent }}>
      {bits}
    </div>
  );
}

export function ReservationTickets({
  dateLabel,
  guestName,
  guestPlaceCode,
  memberName,
  movies,
  ownPlaceCode,
  screeningId,
  screeningTitle,
  timeLabel,
}: {
  dateLabel: string;
  guestName: string | null;
  guestPlaceCode: string | null;
  memberName: string;
  movies: MovieOptionInput[];
  ownPlaceCode: string;
  screeningId: string;
  screeningTitle: string;
  timeLabel: string;
}) {
  const deckRef = useRef<HTMLDivElement>(null);
  const seats = guestPlaceCode
    ? `${placeDisplayLabel(ownPlaceCode)} · ${placeDisplayLabel(guestPlaceCode)}`
    : placeDisplayLabel(ownPlaceCode);
  const cards = movies.length ? movies : [{
    id: "funcion",
    title: screeningTitle,
    year: 0,
    director: "",
    bio: "",
    image: null,
  } satisfies MovieOptionInput];
  const accents = ["#ff5538", "#7dd3fc", "#f0c20c", "#f9a8d4", "#86efac"];

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    function onMove(event: PointerEvent) {
      const node = deckRef.current;
      if (!node) return;
      const box = node.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width - 0.5) * 10;
      const y = ((event.clientY - box.top) / box.height - 0.5) * -8;
      node.style.setProperty("--tilt-x", `${y}deg`);
      node.style.setProperty("--tilt-y", `${x}deg`);
    }
    function reset() {
      deckRef.current?.style.setProperty("--tilt-x", "0deg");
      deckRef.current?.style.setProperty("--tilt-y", "0deg");
    }
    deck.addEventListener("pointermove", onMove);
    deck.addEventListener("pointerleave", reset);
    return () => {
      deck.removeEventListener("pointermove", onMove);
      deck.removeEventListener("pointerleave", reset);
    };
  }, []);

  return (
    <section className="ticketStage" id="tickets">
      <p className="kicker">Tus entradas</p>
      <h2>Guardalas. La ganadora se decide entre estas.</h2>
      <p className="ticketStageCopy">
        {memberName.split(" ")[0]}, {seats}
        {guestName ? ` · +1 ${guestName}` : ""}. Mendoza.
      </p>
      <div className="ticketDeck" ref={deckRef}>
        {cards.map((movie, index) => {
          const accent = movie.image?.accent || accents[index % accents.length];
          const still = movieStill(screeningId, movie);
          return (
            <article
              className="ticketCard"
              key={movie.id}
              style={{
                "--ticket-accent": accent,
                "--ticket-index": index,
                "--ticket-count": cards.length,
              } as React.CSSProperties}
            >
              {still ? <img alt="" className="ticketStill" src={still} /> : <div className="ticketStill ticketStillFallback" />}
              <div className="ticketShade" />
              <div className="ticketBody">
                <strong className="ticketBrand">Pochoclo <i>Club</i></strong>
                <h3>{movie.title}</h3>
                {movie.year ? (
                  <p className="ticketMetaLine">{movie.year} · {movie.director}</p>
                ) : null}
                <dl className="ticketFacts">
                  <div>
                    <dt>Fecha</dt>
                    <dd>{dateLabel}</dd>
                  </div>
                  <div>
                    <dt>Hora</dt>
                    <dd>{timeLabel}</dd>
                  </div>
                  <div>
                    <dt>Lugar</dt>
                    <dd>Mendoza</dd>
                  </div>
                  <div>
                    <dt>Asientos</dt>
                    <dd>{seats}</dd>
                  </div>
                </dl>
              </div>
              <div className="ticketStub">
                <FakeQr accent={accent} seed={`${screeningId}-${ownPlaceCode}-${movie.id}`} />
                <p>Mostrá esta entrada al llegar. La película se confirma con el cierre de la votación.</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
