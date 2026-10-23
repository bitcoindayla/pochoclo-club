import { describe, expect, it } from "vitest";

import {
  hashInvitationToken,
  invitationExpiration,
  invitationStatus,
  isInvitationToken,
  isMemberInvitation,
  nextRedemptionMemberIds,
  parseInvitationCount,
  parseInviterMemberId,
  readRedemptionMemberIds,
} from "./invitation-policy";

describe("invitation tokens", () => {
  it("accepts only 256-bit base64url tokens", () => {
    expect(isInvitationToken("a".repeat(43))).toBe(true);
    expect(isInvitationToken("a".repeat(42))).toBe(false);
    expect(isInvitationToken(`${"a".repeat(42)}+`)).toBe(false);
  });

  it("hashes a token without retaining the bearer secret", () => {
    expect(hashInvitationToken("a".repeat(43))).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInvitationToken("a".repeat(43))).not.toContain("a".repeat(43));
  });

  it("expires invitations after exactly 30 days", () => {
    const createdAt = new Date("2026-08-03T12:00:00.000Z");
    expect(invitationExpiration(createdAt).toISOString()).toBe(
      "2026-09-02T12:00:00.000Z",
    );
  });
});

describe("invitation lifecycle", () => {
  const now = new Date("2026-08-03T12:00:00.000Z");

  it.each([
    ["available", null, null, "2026-08-04T12:00:00.000Z"],
    ["used", new Date("2026-08-03T10:00:00.000Z"), null, "2026-08-04T12:00:00.000Z"],
    ["revoked", null, new Date("2026-08-03T10:00:00.000Z"), "2026-08-04T12:00:00.000Z"],
    ["expired", null, null, "2026-08-03T12:00:00.000Z"],
  ] as const)("reports %s", (expected, usedAt, revokedAt, expiresAt) => {
    expect(
      invitationStatus(
        { expiresAt: new Date(expiresAt), usedAt, revokedAt },
        now,
      ),
    ).toBe(expected);
  });

  it("accepts batches from 1 through 20 only", () => {
    expect(parseInvitationCount("1")).toBe(1);
    expect(parseInvitationCount("20")).toBe(20);
    expect(() => parseInvitationCount("0")).toThrow();
    expect(() => parseInvitationCount("1.5")).toThrow();
    expect(() => parseInvitationCount("21")).toThrow();
  });
});

describe("member invitations", () => {
  it("accepts a member id and rejects a path", () => {
    expect(parseInviterMemberId("ana")).toBe("ana");
    expect(parseInviterMemberId("member-550e8400-e29b-41d4-a716-446655440000")).toMatch(/^member-/);
    expect(() => parseInviterMemberId("ana/otra")).toThrow(/quién invita/);
    expect(() => parseInviterMemberId("")).toThrow(/quién invita/);
    expect(isMemberInvitation("member")).toBe(true);
    expect(isMemberInvitation(undefined)).toBe(false);
  });

  it("records each person once, in arrival order, without a cap", () => {
    expect(readRedemptionMemberIds(["ana", "ana", "no/id", 3])).toEqual(["ana"]);
    expect(nextRedemptionMemberIds(["ana"], "luis")).toEqual(["ana", "luis"]);
    expect(nextRedemptionMemberIds(["ana", "luis"], "ana")).toEqual(["ana", "luis"]);
    expect(nextRedemptionMemberIds(undefined, "ana")).toEqual(["ana"]);
  });
});
