import { describe, expect, it } from "vitest";

import {
  applyAttendanceStatus,
  attendanceForMember,
  presentAttendees,
  snapshotAttendance,
  sumMemberAttendance,
} from "./attendance-policy";

const scores = {
  fotografia: 8,
  sonido: 7,
  actuacion: 9,
  guion: 6,
  direccion: 8,
};

const host = {
  personId: "host-1",
  name: "Lucía",
  kind: "self" as const,
  memberId: "host-1",
  hostMemberId: null,
  hostName: null,
  placeCode: "A1",
};

const guest = {
  personId: "external-abc",
  name: "Mara",
  kind: "guest" as const,
  memberId: null,
  hostMemberId: "host-1",
  hostName: "Lucía",
  placeCode: "A2",
};

const other = {
  personId: "member-2",
  name: "Diego",
  kind: "self" as const,
  memberId: "member-2",
  hostMemberId: null,
  hostName: null,
  placeCode: "B1",
};

describe("snapshotAttendance", () => {
  it("marks scored occupants present and the rest absent", () => {
    const records = snapshotAttendance(
      [host, guest, other],
      [
        { personId: "host-1", scores, average: 7.6 },
        { personId: "external-abc", scores, average: 7.6 },
      ],
    );

    expect(records.map((row) => [row.personId, row.status, row.average])).toEqual([
      ["member-2", "ausente", null],
      ["host-1", "presente", 7.6],
      ["external-abc", "presente", 7.6],
    ]);
  });

  it("ignores scores from people who are no longer in occupancy", () => {
    const records = snapshotAttendance(
      [host],
      [{ personId: "cancelled", scores, average: 8 }],
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.status).toBe("ausente");
  });

  it("keeps the guest attributed to the host", () => {
    const [record] = snapshotAttendance([guest], []);
    expect(record?.hostMemberId).toBe("host-1");
    expect(record?.kind).toBe("guest");
    expect(record?.status).toBe("ausente");
  });
});

describe("applyAttendanceStatus", () => {
  it("flips a single person without touching the rest", () => {
    const records = snapshotAttendance([host, other], []);
    const next = applyAttendanceStatus(records, "host-1", "presente");
    expect(next.find((row) => row.personId === "host-1")?.status).toBe("presente");
    expect(next.find((row) => row.personId === "member-2")?.status).toBe("ausente");
  });

  it("rejects an unknown person", () => {
    expect(() => applyAttendanceStatus(snapshotAttendance([host], []), "nope", "presente")).toThrow(
      /no está/,
    );
  });
});

describe("member views", () => {
  const films = [
    {
      id: "film-1",
      watchedAt: new Date("2026-08-23T15:00:00.000Z"),
      title: "The Invite",
      year: 2022,
      attendees: snapshotAttendance(
        [host, guest, other],
        [{ personId: "host-1", scores, average: 7.6 }],
      ),
    },
  ];

  it("counts only the member's own nights", () => {
    expect(sumMemberAttendance(films, "host-1")).toEqual({ present: 1, absent: 0 });
    expect(sumMemberAttendance(films, "member-2")).toEqual({ present: 0, absent: 1 });
  });

  it("groups the member with the guests they brought", () => {
    const [night] = attendanceForMember(films, "host-1");
    expect(night?.own?.status).toBe("presente");
    expect(night?.guests.map((row) => row.name)).toEqual(["Mara"]);
  });

  it("lists only present people for the public score breakdown", () => {
    expect(presentAttendees(films[0]!.attendees).map((row) => row.name)).toEqual(["Lucía"]);
  });
});
