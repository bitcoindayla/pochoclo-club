import "server-only";

import {
  catalogFestivalMarks,
  festivalMarksKey,
  marksFromAwardHints,
  mergeFestivalMarks,
  parseFestivalMarks,
  type FestivalAwardHint,
  type FestivalMark,
  type FestivalResult,
} from "@/lib/festival-policy";

type SparqlValue = { type?: string; value?: string };
type SparqlBinding = Record<string, SparqlValue>;

function qidFromUri(value?: string) {
  const match = value?.trim().match(/\/(Q\d+)$/);
  return match?.[1] ?? null;
}

function bindingText(...values: SparqlValue[]) {
  return values
    .map((value) => (typeof value?.value === "string" ? value.value.trim() : ""))
    .filter(Boolean);
}

function parseAwardHints(payload: unknown): FestivalAwardHint[] {
  if (!payload || typeof payload !== "object" || !("results" in payload)) return [];
  const results = (payload as { results?: { bindings?: unknown } }).results;
  if (!results || typeof results !== "object" || !Array.isArray(results.bindings)) return [];

  const hints: FestivalAwardHint[] = [];
  for (const row of results.bindings) {
    if (!row || typeof row !== "object") continue;
    const binding = row as SparqlBinding;
    const result = binding.type?.value;
    if (result !== "won" && result !== "nominated") continue;
    hints.push({
      qid: qidFromUri(binding.award?.value),
      result: result as FestivalResult,
      labels: bindingText(binding.awardLabel, binding.byLabel, binding.partLabel),
      orgQids: [qidFromUri(binding.by?.value), qidFromUri(binding.part?.value)].filter(
        (id): id is string => Boolean(id),
      ),
    });
  }
  return hints;
}

async function lookupWikidataFestivalMarks(imdbId: string): Promise<FestivalMark[]> {
  const query = `
SELECT ?award ?awardLabel ?type ?by ?byLabel ?part ?partLabel WHERE {
  ?film wdt:P345 "${imdbId}" .
  {
    ?film p:P166 ?stmt .
    ?stmt ps:P166 ?award .
    BIND("won" AS ?type)
  } UNION {
    ?film p:P1411 ?stmt .
    ?stmt ps:P1411 ?award .
    BIND("nominated" AS ?type)
  }
  OPTIONAL { ?award wdt:P1027 ?by . }
  OPTIONAL { ?award wdt:P361 ?part . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}`;
  try {
    const response = await fetch(
      `https://query.wikidata.org/sparql?${new URLSearchParams({ format: "json", query })}`,
      {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "PochocloClub/1.0 (https://pochoclo.club)",
        },
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      },
    );
    if (!response.ok) return [];
    return marksFromAwardHints(parseAwardHints(await response.json()));
  } catch {
    return [];
  }
}

export async function enrichMovieFestivals<
  T extends { imdbId?: string | null; awards?: FestivalMark[] | null },
>(movie: T): Promise<T> {
  const stored = parseFestivalMarks(movie.awards);
  if (!movie.imdbId) return { ...movie, awards: stored };
  try {
    const lookedUp = mergeFestivalMarks([
      ...catalogFestivalMarks(movie.imdbId),
      ...(await lookupWikidataFestivalMarks(movie.imdbId)),
    ]);
    return { ...movie, awards: lookedUp.length ? lookedUp : stored };
  } catch {
    return { ...movie, awards: stored.length ? stored : catalogFestivalMarks(movie.imdbId) };
  }
}

export function festivalOptionsChanged<
  T extends { imdbId?: string | null; imdbRating?: number | null; awards?: FestivalMark[] | null },
>(left: T[], right: T[]) {
  return left.some((option, index) => {
    const next = right[index];
    return (
      option.imdbId !== next?.imdbId ||
      option.imdbRating !== next?.imdbRating ||
      festivalMarksKey(option.awards) !== festivalMarksKey(next?.awards)
    );
  });
}
