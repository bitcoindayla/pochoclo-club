import { localScreeningDate } from "./screening-policy";

export const MIN_MOVIE_OPTIONS = 3;
export const MAX_MOVIE_OPTIONS = 5;

export type MovieOptionInput = {
  id: string;
  title: string;
  year: number;
  director: string;
  bio: string;
};

export type MovieBallotInput = {
  localCloseDate: string;
  localCloseTime: string;
  closesAt: Date;
  options: MovieOptionInput[];
};

export type MovieBallotStatus = "draft" | "open" | "decision" | "closed" | "canceled";

export class MovieVotingPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MovieVotingPolicyError";
  }
}

function textField(
  formData: FormData,
  name: string,
  label: string,
  maximum: number,
  required: boolean,
) {
  const value = formData.get(name);
  const text = typeof value === "string" ? value.trim() : "";
  if (!text && required) throw new MovieVotingPolicyError(`${label} es obligatorio.`);
  if (text.length > maximum) {
    throw new MovieVotingPolicyError(`${label} puede tener hasta ${maximum} caracteres.`);
  }
  return text;
}

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMovieBallotInput(
  formData: FormData,
  now = new Date(),
): MovieBallotInput {
  const localCloseDate = textField(
    formData,
    "closeDate",
    "La fecha de cierre",
    10,
    true,
  );
  const localCloseTime = textField(
    formData,
    "closeTime",
    "El horario de cierre",
    5,
    true,
  );
  let closesAt: Date;
  try {
    closesAt = localScreeningDate(localCloseDate, localCloseTime);
  } catch {
    throw new MovieVotingPolicyError("Elegí una fecha y un horario de cierre válidos.");
  }
  if (closesAt.getTime() <= now.getTime()) {
    throw new MovieVotingPolicyError("El cierre de la votación tiene que ser en el futuro.");
  }

  const options: MovieOptionInput[] = [];
  for (let index = 1; index <= MAX_MOVIE_OPTIONS; index += 1) {
    const title = textField(
      formData,
      `movieTitle${index}`,
      `El título de la película ${index}`,
      120,
      index <= MIN_MOVIE_OPTIONS,
    );
    const hasAnyOptionalField = ["Year", "Director", "Bio"].some((suffix) => {
      const value = formData.get(`movie${suffix}${index}`);
      return typeof value === "string" && Boolean(value.trim());
    });
    if (!title) {
      if (hasAnyOptionalField) {
        throw new MovieVotingPolicyError(
          `Completá el título de la película ${index} o dejá toda esa opción vacía.`,
        );
      }
      continue;
    }

    const yearText = textField(
      formData,
      `movieYear${index}`,
      `El año de ${title}`,
      4,
      true,
    );
    const year = Number(yearText);
    if (!/^\d{4}$/.test(yearText) || year < 1888 || year > now.getFullYear() + 2) {
      throw new MovieVotingPolicyError(`El año de ${title} no es válido.`);
    }
    const director = textField(
      formData,
      `movieDirector${index}`,
      `El director de ${title}`,
      120,
      true,
    );
    const bio = textField(
      formData,
      `movieBio${index}`,
      `La sinopsis de ${title}`,
      360,
      true,
    );
    options.push({ id: `movie-${index}`, title, year, director, bio });
  }

  if (options.length < MIN_MOVIE_OPTIONS || options.length > MAX_MOVIE_OPTIONS) {
    throw new MovieVotingPolicyError(
      `La cartelera debe tener entre ${MIN_MOVIE_OPTIONS} y ${MAX_MOVIE_OPTIONS} películas.`,
    );
  }
  const normalizedTitles = options.map((option) => normalizeTitle(option.title));
  if (new Set(normalizedTitles).size !== normalizedTitles.length) {
    throw new MovieVotingPolicyError("No se puede repetir una película en la misma cartelera.");
  }

  return { localCloseDate, localCloseTime, closesAt, options };
}

export function planMovieVote({
  optionIds,
  previousSelection,
  nextSelection,
  counts,
}: {
  optionIds: string[];
  previousSelection: string[];
  nextSelection: string[];
  counts: Record<string, number>;
}) {
  const validIds = new Set(optionIds);
  const selectedIds = [...new Set(nextSelection)].filter((id) => validIds.has(id));
  if (selectedIds.length < 1) {
    throw new MovieVotingPolicyError("Elegí por lo menos una película.");
  }
  if (selectedIds.length !== new Set(nextSelection).size) {
    throw new MovieVotingPolicyError("La selección contiene una película inválida.");
  }

  const previousIds = new Set(previousSelection.filter((id) => validIds.has(id)));
  const nextIds = new Set(selectedIds);
  const nextCounts = Object.fromEntries(
    optionIds.map((id) => {
      const current = counts[id];
      if (!Number.isInteger(current) || current < 0) {
        throw new MovieVotingPolicyError("No pudimos verificar los resultados actuales.");
      }
      const delta = Number(nextIds.has(id)) - Number(previousIds.has(id));
      const next = current + delta;
      if (next < 0) {
        throw new MovieVotingPolicyError("No pudimos actualizar los resultados.");
      }
      return [id, next];
    }),
  );

  return {
    selection: optionIds.filter((id) => nextIds.has(id)),
    counts: nextCounts,
    isFirstVote: previousIds.size === 0,
  };
}

export function resolveMovieBallot(optionIds: string[], counts: Record<string, number>) {
  if (optionIds.length < MIN_MOVIE_OPTIONS || optionIds.length > MAX_MOVIE_OPTIONS) {
    throw new MovieVotingPolicyError("La cartelera no tiene una cantidad válida de películas.");
  }
  const tallies = optionIds.map((id) => {
    const value = counts[id];
    if (!Number.isInteger(value) || value < 0) {
      throw new MovieVotingPolicyError("No pudimos verificar los resultados.");
    }
    return { id, value };
  });
  const highest = Math.max(...tallies.map((entry) => entry.value));
  const finalists = tallies
    .filter((entry) => entry.value === highest)
    .map((entry) => entry.id);

  if (highest > 0 && finalists.length === 1) {
    return { kind: "winner" as const, winnerOptionId: finalists[0], decisionOptionIds: [] };
  }
  return {
    kind: "decision" as const,
    winnerOptionId: null,
    decisionOptionIds: highest === 0 ? optionIds : finalists,
  };
}

export function memberCanAccessSeats({
  ballotStatus,
  hasVote,
  hasExemption,
}: {
  ballotStatus: MovieBallotStatus | null;
  hasVote: boolean;
  hasExemption: boolean;
}) {
  if (ballotStatus === null || ballotStatus === "canceled") return true;
  return hasVote || hasExemption;
}
