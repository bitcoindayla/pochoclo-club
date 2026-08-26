import { presentAttendees, type AttendanceRecord } from "@/lib/attendance-policy";
import { CRITIQUE_CATEGORIES, type CritiqueScores } from "@/lib/critique-policy";
import type { FilmHistoryEntry } from "@/lib/critiques";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: CLUB_TIME_ZONE,
  }).format(date);
}

function CategoryBars({ scores }: { scores: CritiqueScores }) {
  return (
    <div className="critiqueBars historyPersonBars">
      {CRITIQUE_CATEGORIES.map((category) => (
        <div className="critiqueBar" key={category.id}>
          <span>{category.label}</span>
          <i>
            <b style={{ width: `${scores[category.id] * 10}%` }} />
          </i>
          <em>{scores[category.id].toFixed(1)}</em>
        </div>
      ))}
    </div>
  );
}

function PersonBreakdown({ person }: { person: AttendanceRecord }) {
  if (!person.scores) {
    return (
      <li className="historyPerson">
        <div className="historyPersonHead">
          <strong>{person.name}</strong>
          <span>—</span>
        </div>
        {person.kind === "guest" && person.hostName ? (
          <small>+1 de {person.hostName}</small>
        ) : null}
      </li>
    );
  }

  return (
    <li className="historyPerson">
      <details>
        <summary className="historyPersonHead">
          <strong>{person.name}</strong>
          <span>{person.average?.toFixed(1)}</span>
        </summary>
        {person.kind === "guest" && person.hostName ? (
          <small>+1 de {person.hostName}</small>
        ) : null}
        <CategoryBars scores={person.scores} />
      </details>
    </li>
  );
}

function FilmRow({ film }: { film: FilmHistoryEntry }) {
  const present = presentAttendees(film.attendees);
  const canOpen = film.source === "critique" && (present.length > 0 || Boolean(film.categoryAverages));

  const head = (
    <>
      <span className="historyFilmDate">{formatDate(film.watchedAt)}</span>
      <span className="historyFilmTitle">
        <strong>{film.title}</strong>
        <small>
          {film.year} · {film.director}
        </small>
      </span>
      <span className="historyFilmScore">
        <strong>{film.score.toFixed(1)}</strong>
        <small>
          {film.voterCount > 0 ? `${film.voterCount} votos` : "archivo"}
        </small>
      </span>
    </>
  );

  if (!canOpen) {
    return <div className="historyFilmRow">{head}</div>;
  }

  return (
    <details className="historyFilm">
      <summary className="historyFilmRow">{head}</summary>
      <div className="historyFilmBody">
        {film.categoryAverages ? (
          <div>
            <p className="kicker">Sala</p>
            <CategoryBars scores={film.categoryAverages} />
          </div>
        ) : null}
        {present.length > 0 ? (
          <div>
            <p className="kicker">Por participante</p>
            <ul className="historyPeople">
              {present.map((person) => (
                <PersonBreakdown key={person.personId} person={person} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function HistoryFilms({ films }: { films: FilmHistoryEntry[] }) {
  return (
    <div className="historyList">
      <div className="historyListHead" aria-hidden="true">
        <span>Fecha</span>
        <span>Película</span>
        <span>Puntaje</span>
      </div>
      {films.map((film) => (
        <FilmRow film={film} key={film.id} />
      ))}
    </div>
  );
}
