"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { layoutDirectors, type DirectorGroup } from "@/lib/director-mosaic";
import { directorPortrait } from "@/lib/director-portraits";

export function DirectorMosaic({
  directors,
  selectedIds,
  onToggleFilm,
}: {
  directors: DirectorGroup[];
  selectedIds?: string[];
  onToggleFilm?: (filmId: string) => void;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1440, height: 828 });
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rects = layoutDirectors(directors, size.width, size.height);
  return (
    <div className="directorCanvas" ref={canvas} style={{ "--director-count": directors.length } as CSSProperties} aria-label="Directores que vimos en Pochoclo Club">
      <h1 className="srOnly">Otra mirada, algo nos queda.</h1>
      {directors.map((director, index) => {
        const rect = rects[index];
        if (!rect) return null;
        const expanded = active === director.id;
        const portrait = directorPortrait(director.id);
        const padding = Math.max(12, Math.min(24, size.width * 0.0135));
        const longestWord = Math.max(...director.name.split(/[\s/]+/).map(word => word.length));
        const fontSize = Math.max(12, Math.min(62, Math.sqrt(rect.width * rect.height) * 0.19,
          (rect.width - padding * 2) * 1.65 / longestWord));
        return (
          <article
            className="directorTile"
            data-open={expanded}
            key={director.id}
            style={{
              left: `${rect.x / size.width * 100}%`, top: `${rect.y / size.height * 100}%`,
              width: `${rect.width / size.width * 100}%`, height: `${rect.height / size.height * 100}%`,
              "--director-size": `${fontSize}px`,
              "--tile-tone": `${9 + index % 5 * 3}`,
            } as CSSProperties}
            onPointerEnter={event => { if (event.pointerType === "mouse") setActive(director.id); }}
            onPointerLeave={event => { if (event.pointerType === "mouse") setActive(null); }}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActive(null); }}
            onKeyDown={event => { if (event.key === "Escape") setActive(null); }}
          >
            {expanded && portrait ? (
              // Local, compressed artwork is loaded only when its tile opens.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="directorPortrait" src={portrait} alt="" aria-hidden="true"
                width={768} height={768} decoding="async" draggable={false} />
            ) : null}
            <button
              type="button"
              className="directorToggle"
              aria-expanded={expanded}
              aria-controls={`director-films-${index}`}
              aria-label={`${director.name}. ${director.films.length} ${director.films.length === 1 ? "película" : "películas"}. Promedio ${director.average.toFixed(1)}. Ver películas y puntajes.`}
              onClick={() => setActive(expanded ? null : director.id)}
              onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setActive(director.id); }}
            >
              <span className="directorIndex">{String(index + 1).padStart(2, "0")}</span>
              <span className="directorName"><span>{director.name}</span></span>
              <span className="directorMeta">{director.films.length} {director.films.length === 1 ? "film" : "films"}<span>{director.average.toFixed(1)}</span></span>
            </button>
            <div className="directorFilms" id={`director-films-${index}`} hidden={!expanded}>
              <ul>
                {director.films.map(film => {
                  const selected = selectedIds?.includes(film.id) ?? false;
                  return (
                    <li key={film.id} data-selected={selected ? "true" : undefined}>
                      {onToggleFilm ? (
                        <button
                          type="button"
                          className="directorFilmPick"
                          aria-pressed={selected}
                          onClick={() => onToggleFilm(film.id)}
                        >
                          <span>{film.title}</span>
                          <strong>{selected ? "vi" : film.score.toFixed(1)}</strong>
                        </button>
                      ) : film.hasEssay ? (
                        <a className="directorFilmLink" href={`/visto/${film.id}`}>
                          <span>{film.title}<i>nota</i></span>
                          <strong>{film.score.toFixed(1)}</strong>
                        </a>
                      ) : (
                        <>
                          <span>{film.title}</span>
                          <strong>{film.score.toFixed(1)}</strong>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </article>
        );
      })}
      {!directors.length ? <p className="directorEmpty">Todavía queda todo el cine por ver.</p> : null}
    </div>
  );
}
