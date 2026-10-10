export type LandingStatsBaseline = {
  screenings: number;
  peoplePerScreening: number;
  reservationsFrom: number;
};

export type CountedScreening = {
  id: string;
  startsAt: number;
  status: string;
  reservations: number;
};

export function qualifiesForLandingStats(
  screening: Pick<CountedScreening, "startsAt" | "status">,
  reservationsFrom: number,
  now: number,
) {
  return screening.status === "closed" && screening.startsAt >= reservationsFrom && screening.startsAt <= now;
}

export function calculateLandingStats(
  baseline: LandingStatsBaseline,
  screenings: CountedScreening[],
  now = Date.now(),
) {
  const counted = new Set<string>();
  let functionsCount = baseline.screenings;
  let people = baseline.screenings * baseline.peoplePerScreening;
  for (const screening of screenings) {
    if (counted.has(screening.id) || !qualifiesForLandingStats(screening, baseline.reservationsFrom, now)) continue;
    counted.add(screening.id);
    functionsCount += 1;
    people += screening.reservations;
  }
  return { functionsCount, people };
}
