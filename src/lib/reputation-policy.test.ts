import { describe, expect, it } from "vitest";

import {
  buildMemberReputation,
  reputationStars,
  reputationSummary,
  reputationTone,
} from "./reputation-policy";

describe("reputationStars", () => {
  it("gives 10 when they came more than once, invited, and never missed", () => {
    expect(reputationStars({ nights: 2, guests: 1, absences: 0 })).toBe(10);
  });

  it("stays below 10 with a single night", () => {
    expect(reputationStars({ nights: 1, guests: 1, absences: 0 })).toBe(8);
  });

  it("is zero without nights", () => {
    expect(reputationStars({ nights: 0, guests: 4, absences: 0 })).toBe(0);
  });

  it("drops with absences", () => {
    expect(reputationStars({ nights: 4, guests: 0, absences: 2 })).toBe(4);
  });
});

describe("buildMemberReputation", () => {
  const nights = [
    {
      closed: true,
      occupants: [
        { personId: "a", memberId: "a", hostMemberId: null, kind: "self" as const },
        {
          personId: "g",
          memberId: null,
          hostMemberId: "a",
          kind: "guest" as const,
        },
      ],
    },
    {
      closed: true,
      occupants: [{ personId: "a", memberId: "a", hostMemberId: null, kind: "self" as const }],
    },
    {
      closed: false,
      occupants: [{ personId: "a", memberId: "a", hostMemberId: null, kind: "self" as const }],
    },
  ];

  it("counts closed nights and guests, ignores the open function", () => {
    const reputation = buildMemberReputation({
      memberId: "a",
      founding: false,
      filmCount: 40,
      nights,
      films: [
        {
          attendees: [
            { memberId: "a", hostMemberId: null, status: "presente", average: 8 },
            { memberId: "a", hostMemberId: null, status: "presente", average: 6.4 },
          ],
        },
      ],
    });
    expect(reputation.nights).toBe(2);
    expect(reputation.guests).toBe(1);
    expect(reputation.average).toBe(7.2);
    expect(reputation.ceiling).toBe(8);
    expect(reputation.floor).toBe(6.4);
    expect(reputation.stars).toBe(10);
    expect(reputation.tone).toBe("pillar");
  });

  it("gives founding members every film and no absences", () => {
    const reputation = buildMemberReputation({
      memberId: "founder",
      founding: true,
      filmCount: 44,
      nights,
      films: [
        {
          attendees: [
            { memberId: "founder", hostMemberId: null, status: "ausente", average: null },
          ],
        },
      ],
    });
    expect(reputation.nights).toBe(44);
    expect(reputation.absences).toBe(0);
    expect(reputation.stars).toBe(9);
  });
});

describe("copy", () => {
  it("builds a readable tooltip", () => {
    expect(
      reputationSummary({
        memberId: "a",
        nights: 12,
        guests: 3,
        absences: 1,
        average: 7.4,
        ceiling: 9.2,
        floor: 5,
        stars: 8,
        tone: "pillar",
      }),
    ).toMatch(/12 funciones · 3 invitados · 1 ausencia · promedio 7\.4/);
  });
});

describe("tone", () => {
  it("marks a member who misses more than they come as drift", () => {
    expect(reputationTone({ nights: 1, guests: 0, absences: 3, stars: 1 })).toBe("drift");
  });
});
