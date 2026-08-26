import { describe, expect, it } from "vitest";

import { canDeactivateMember, parseDisplayName } from "./member-admin-policy";

describe("parseDisplayName", () => {
  it("trims a valid name", () => {
    expect(parseDisplayName("  Ana Pérez  ")).toBe("Ana Pérez");
  });

  it("rejects an empty name", () => {
    expect(() => parseDisplayName("   ")).toThrow(/nombre/);
  });

  it("rejects names longer than 100 characters", () => {
    expect(() => parseDisplayName("a".repeat(101))).toThrow(/100/);
  });
});

describe("canDeactivateMember", () => {
  const members = [
    { id: "admin-1", role: "admin" as const, active: true },
    { id: "admin-2", role: "admin" as const, active: true },
    { id: "member-1", role: "member" as const, active: true },
    { id: "gone", role: "admin" as const, active: false },
  ];

  it("lets an admin deactivate a member", () => {
    expect(canDeactivateMember(members, "member-1")).toEqual({ ok: true });
  });

  it("lets an admin deactivate another admin when one remains", () => {
    expect(canDeactivateMember(members, "admin-2")).toEqual({ ok: true });
  });

  it("blocks deactivating the last active admin", () => {
    expect(canDeactivateMember(members.slice(0, 1), "admin-1")).toEqual({
      ok: false,
      reason: "No se puede desactivar al único administrador.",
    });
  });

  it("ignores inactive admins when counting the last one", () => {
    expect(
      canDeactivateMember(
        [
          { id: "admin-1", role: "admin", active: true },
          { id: "gone", role: "admin", active: false },
        ],
        "admin-1",
      ).ok,
    ).toBe(false);
  });

  it("is a no-op when the person is already inactive", () => {
    expect(canDeactivateMember(members, "gone")).toEqual({ ok: true });
  });
});
