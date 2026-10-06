export type PreludeFilm = {
  id: string;
  title: string;
  year: number;
  director: string;
  bio: string;
  votes: number;
  stillUrl: string | null;
  isWinner: boolean;
};

export type PreludeCountdown = {
  hours: number;
  minutes: number;
  seconds: number;
  started: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function remainingToStart(startsAt: Date, now = new Date()): PreludeCountdown {
  const total = Math.max(0, Math.floor((startsAt.getTime() - now.getTime()) / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    started: startsAt.getTime() <= now.getTime(),
  };
}

export function formatCountdown(parts: PreludeCountdown) {
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}

export function rankPreludeFilms(films: PreludeFilm[]) {
  return [...films].sort(
    (a, b) => b.votes - a.votes || a.title.localeCompare(b.title, "es"),
  );
}

export function defaultFeaturedId(
  films: PreludeFilm[],
  screeningTitle?: string | null,
) {
  if (screeningTitle) {
    const match = films.find(
      (film) => film.title.localeCompare(screeningTitle, "es", { sensitivity: "accent" }) === 0,
    );
    if (match) return match.id;
  }
  const winner = films.find((film) => film.isWinner);
  if (winner) return winner.id;
  return rankPreludeFilms(films)[0]?.id ?? "";
}

export function preludeFilmsFrom({
  screeningId,
  movie,
  ballot,
}: {
  screeningId: string;
  movie: { title: string; year: number; director: string; bio: string } | null;
  ballot: {
    winnerOptionId: string | null;
    counts: Record<string, number>;
    options: Array<{
      id: string;
      title: string;
      year: number;
      director: string;
      bio: string;
      image?: { landscapePath?: string | null } | null;
    }>;
  } | null;
}): PreludeFilm[] {
  if (ballot?.options.length) {
    return ballot.options.map((option) => ({
      id: option.id,
      title: option.title,
      year: option.year,
      director: option.director,
      bio: option.bio,
      votes: ballot.counts[option.id] ?? 0,
      stillUrl: option.image?.landscapePath
        ? `/api/movie-images/${screeningId}/${option.id}/landscape`
        : null,
      isWinner: option.id === ballot.winnerOptionId,
    }));
  }
  if (!movie) return [];
  return [
    {
      id: "tonight",
      title: movie.title,
      year: movie.year,
      director: movie.director,
      bio: movie.bio,
      votes: 0,
      stillUrl: null,
      isWinner: true,
    },
  ];
}
