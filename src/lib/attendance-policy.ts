import type { CritiqueScores } from "@/lib/critique-policy";

export type AttendanceStatus = "presente" | "ausente";
export type AttendanceKind = "self" | "guest";

export type OccupantSnapshot = {
  personId: string;
  name: string;
  kind: AttendanceKind;
  memberId: string | null;
  hostMemberId: string | null;
  hostName: string | null;
  placeCode: string;
};

export type ScoreSnapshot = {
  personId: string;
  scores: CritiqueScores;
  average: number;
};

export type AttendanceRecord = OccupantSnapshot & {
  status: AttendanceStatus;
  scores: CritiqueScores | null;
  average: number | null;
};

export class AttendanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttendanceError";
  }
}

export function parseAttendanceStatus(value: unknown): AttendanceStatus {
  if (value === "presente" || value === "ausente") return value;
  throw new AttendanceError("El estado de asistencia no es válido.");
}

function byName(left: AttendanceRecord, right: AttendanceRecord) {
  return left.name.localeCompare(right.name, "es");
}

export function snapshotAttendance(
  occupants: OccupantSnapshot[],
  scores: ScoreSnapshot[],
): AttendanceRecord[] {
  const scored = new Map(scores.map((row) => [row.personId, row]));
  return occupants
    .map((occupant) => {
      const vote = scored.get(occupant.personId);
      return {
        ...occupant,
        status: vote ? ("presente" as const) : ("ausente" as const),
        scores: vote?.scores ?? null,
        average: vote?.average ?? null,
      };
    })
    .sort(byName);
}

export function applyAttendanceStatus(
  records: AttendanceRecord[],
  personId: string,
  status: AttendanceStatus,
): AttendanceRecord[] {
  let found = false;
  const next = records.map((record) => {
    if (record.personId !== personId) return record;
    found = true;
    return { ...record, status };
  });
  if (!found) throw new AttendanceError("Esa persona no está en la función.");
  return next;
}

export function presentAttendees(records: AttendanceRecord[]) {
  return records.filter((record) => record.status === "presente");
}

export function attendanceCounts(records: AttendanceRecord[]) {
  return records.reduce(
    (counts, record) => {
      if (record.status === "presente") counts.present += 1;
      else counts.absent += 1;
      return counts;
    },
    { present: 0, absent: 0 },
  );
}

export function memberAttendanceCounts(records: AttendanceRecord[], memberId: string) {
  const own = records.find((record) => record.memberId === memberId);
  if (!own) return { present: 0, absent: 0 };
  return own.status === "presente" ? { present: 1, absent: 0 } : { present: 0, absent: 1 };
}

export function sumMemberAttendance(
  films: Array<{ attendees: AttendanceRecord[] }>,
  memberId: string,
) {
  return films.reduce(
    (totals, film) => {
      const night = memberAttendanceCounts(film.attendees, memberId);
      totals.present += night.present;
      totals.absent += night.absent;
      return totals;
    },
    { present: 0, absent: 0 },
  );
}

export function attendanceForMember(
  films: Array<{
    id: string;
    watchedAt: Date;
    title: string;
    year: number;
    attendees: AttendanceRecord[];
  }>,
  memberId: string,
) {
  return films.flatMap((film) => {
    const own = film.attendees.find((record) => record.memberId === memberId) ?? null;
    const guests = film.attendees
      .filter((record) => record.hostMemberId === memberId && record.personId !== own?.personId)
      .sort(byName);
    if (!own && guests.length === 0) return [];
    return [
      {
        filmId: film.id,
        watchedAt: film.watchedAt,
        title: film.title,
        year: film.year,
        own,
        guests,
      },
    ];
  });
}
