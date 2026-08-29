import { roundScore } from "./critique-policy";

export const FOUNDING_MEMBER_EMAILS = [
  "gandia.alvaro@gmail.com",
  "pochocloclubfans@gmail.com",
] as const;

export type ReputationTone = "seed" | "member" | "host" | "pillar" | "drift";

export const REPUTATION_TONE_LABEL: Record<ReputationTone, string> = {
  seed: "Nuevo",
  member: "En el club",
  host: "Anfitrión",
  pillar: "Pilar",
  drift: "Intermitente",
};

export type Reputation = {
  memberId: string;
  nights: number;
  guests: number;
  absences: number;
  average: number | null;
  ceiling: number | null;
  floor: number | null;
  stars: number;
  tone: ReputationTone;
};

export type ReputationNight = {
  closed: boolean;
  occupants: Array<{
    personId: string;
    memberId: string | null;
    hostMemberId: string | null;
    kind: "self" | "guest";
  }>;
};

export type ReputationFilm = {
  attendees: Array<{
    memberId: string | null;
    hostMemberId: string | null;
    status: "presente" | "ausente";
    average: number | null;
  }>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function isFoundingEmail(email: string) {
  return FOUNDING_MEMBER_EMAILS.includes(
    email.trim().toLocaleLowerCase("en-US") as (typeof FOUNDING_MEMBER_EMAILS)[number],
  );
}

export function reputationStars({
  nights,
  guests,
  absences,
}: {
  nights: number;
  guests: number;
  absences: number;
}) {
  if (nights <= 0) return 0;
  let stars = nights === 1 ? 4 : 6;
  if (nights >= 12) stars = 7;
  if (guests > 0) stars += 2;
  if (absences === 0) stars += 2;
  else stars -= Math.min(absences, 4);
  return clamp(stars, 0, 10);
}

export function reputationTone(input: {
  nights: number;
  guests: number;
  absences: number;
  stars: number;
}): ReputationTone {
  if (input.nights <= 0) return "seed";
  if (input.absences > input.nights) return "drift";
  if (input.stars >= 8) return "pillar";
  if (input.guests > 0) return "host";
  return "member";
}

export function normalizePersonName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es");
}

export function guestReputationId(name: string) {
  return `guest:${normalizePersonName(name)}`;
}

export function buildMemberReputation({
  memberId,
  founding,
  filmCount,
  nights,
  films,
  archiveNights = 0,
  archiveGuests = 0,
}: {
  memberId: string;
  founding: boolean;
  filmCount: number;
  nights: ReputationNight[];
  films: ReputationFilm[];
  archiveNights?: number;
  archiveGuests?: number;
}): Reputation {
  const occupied = new Set<number>();
  let guests = 0;

  nights.forEach((night, index) => {
    if (!night.closed) return;
    for (const occupant of night.occupants) {
      if (occupant.memberId === memberId) occupied.add(index);
      if (occupant.kind === "guest" && occupant.hostMemberId === memberId) {
        guests += 1;
      }
    }
  });

  let absences = 0;
  const scores: number[] = [];
  for (const film of films) {
    for (const row of film.attendees) {
      if (row.memberId !== memberId) continue;
      if (row.status === "ausente") absences += 1;
      if (typeof row.average === "number") scores.push(row.average);
    }
  }

  let present = Math.max(occupied.size, archiveNights);
  guests = Math.max(guests, archiveGuests);
  if (founding) {
    present = Math.max(present, filmCount);
    absences = 0;
  }

  const average =
    scores.length > 0
      ? roundScore(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : null;
  const ceiling = scores.length > 0 ? roundScore(Math.max(...scores)) : null;
  const floor = scores.length > 0 ? roundScore(Math.min(...scores)) : null;
  const stars = reputationStars({ nights: present, guests, absences });

  return {
    memberId,
    nights: present,
    guests,
    absences,
    average,
    ceiling,
    floor,
    stars,
    tone: reputationTone({ nights: present, guests, absences, stars }),
  };
}

export function reputationSummary(reputation: Reputation) {
  const parts = [
    `${reputation.nights} ${reputation.nights === 1 ? "función" : "funciones"}`,
    `${reputation.guests} invitado${reputation.guests === 1 ? "" : "s"}`,
  ];
  if (reputation.absences > 0) {
    parts.push(`${reputation.absences} ausencia${reputation.absences === 1 ? "" : "s"}`);
  }
  if (reputation.average != null) {
    parts.push(`promedio ${reputation.average.toFixed(1)}`);
  }
  if (reputation.ceiling != null && reputation.floor != null) {
    parts.push(`techo ${reputation.ceiling.toFixed(1)} · piso ${reputation.floor.toFixed(1)}`);
  }
  parts.push(`${reputation.stars} de 10`);
  return parts.join(" · ");
}
