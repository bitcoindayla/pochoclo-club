import { describe, expect, it } from "vitest";

import {
  hashInvitationToken,
  invitationExpiration,
  invitationStatus,
  isInvitationToken,
  parseInvitationCount,
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
