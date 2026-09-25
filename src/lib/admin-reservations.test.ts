import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

// Isolated, serialized transactional model. No Firebase credentials or live writes.
// This tests invariants and rollback, not the Firestore SDK's retry implementation.
const store = vi.hoisted(() => ({ documents: new Map<string, Record<string, unknown>>(), queue: Promise.resolve() }));
vi.mock("@/lib/firebase/admin", () => {
  type Data = Record<string, unknown>;
  type Reference = { path: string; query?: boolean; filters?: Array<[string, unknown]>; sort?: string; count?: number };
  const snapshot = (path: string) => ({ id: path.split("/").at(-1), exists: store.documents.has(path), data: () => store.documents.get(path) });
  const querySnapshot = (r: Reference) => {
    let docs = [...store.documents.keys()].filter((key) => key.startsWith(`${r.path}/`) && key.split("/").length === r.path.split("/").length + 1).map(snapshot);
    for (const [field, value] of r.filters ?? []) docs = docs.filter((doc) => doc.data()?.[field] === value);
    if (r.sort) docs.sort((a, b) => Number(a.data()?.[r.sort!]) - Number(b.data()?.[r.sort!]));
    docs = docs.slice(0, r.count);
    return { docs, empty: docs.length === 0, size: docs.length };
  };
  const ref = (path: string) => ({
    path, id: path.split("/").at(-1), collection: (name: string) => collection(`${path}/${name}`), get: async () => snapshot(path),
    create: async (data: Data) => {
      if (store.documents.has(path)) throw new Error("Already exists");
      store.documents.set(path, data);
    },
  });
  const collection = (path: string, options: Partial<Reference> = {}) => ({
    path, query: true, ...options,
    doc: (id: string) => ref(`${path}/${id}`),
    get: async () => querySnapshot({ path, ...options }),
    limit: (count: number) => collection(path, { ...options, count }),
    orderBy: (sort: string) => collection(path, { ...options, sort }),
    where: (field: string, _operator: string, value: unknown) => collection(path, { ...options, filters: [...options.filters ?? [], [field, value]] }),
  });
  return { getAdminFirestore: () => ({
    collection,
    getAll: async (...refs: Reference[]) => refs.map((r) => snapshot(r.path)),
    runTransaction: (callback: (tx: unknown) => Promise<unknown>) => {
      const run = store.queue.then(async () => {
        const writes: Array<() => void> = [];
        const result = await callback({
          get: async (r: Reference) => {
            if (writes.length) throw new Error("Read after write");
            return r.query ? querySnapshot(r) : snapshot(r.path);
          },
          create: (r: Reference, data: Data) => {
            if (store.documents.has(r.path)) throw new Error("Already exists");
            writes.push(() => { store.documents.set(r.path, data); });
          },
          set: (r: Reference, data: Data) => { writes.push(() => { store.documents.set(r.path, data); }); },
          update: (r: Reference, data: Data) => {
            if (!store.documents.has(r.path)) throw new Error("Missing document");
            writes.push(() => { store.documents.set(r.path, { ...store.documents.get(r.path), ...data }); });
          },
          delete: (r: Reference) => { writes.push(() => { store.documents.delete(r.path); }); },
        });
        writes.forEach((write) => write());
        return result;
      });
      store.queue = run.then(() => undefined, () => undefined);
      return run;
    },
  }) };
});

import { reserveSeatAsAdmin } from "./admin-reservations";
import { parseAdminReservationInput, type AdminReservationInput } from "./admin-reservation-policy";
import { authorizeFirebaseIdentity, getMemberByFirebaseUid, memberEmailLockId } from "./members";
import { cancelOwnReservation, changeOwnSeat, reserveGuestSeat, reserveOwnSeat } from "./screenings";
import { openCritiqueSession } from "./critiques";

const docs = store.documents;
const profile = (name: string, email: string, role = "member") => ({ name, email, role, active: true, imageUrl: null, createdAt: Timestamp.now() });
const input = (person: AdminReservationInput["person"] = { mode: "member", memberId: "ana" }, placeCode: AdminReservationInput["placeCode"] = "A1"): AdminReservationInput => ({ screeningId: "night", requestId: randomUUID(), placeCode, person });
const account = () => input({ mode: "account", name: "Nueva", email: "nueva@example.com" });
const identity = (email = "nueva@example.com", uid = "google-uid") => ({ uid, email, name: "Nombre Google", imageUrl: null });

beforeEach(() => {
  docs.clear();
  docs.set("members/admin", profile("Admin", "admin@example.com", "admin"));
  docs.set("members/ana", profile("Ana", "ana@example.com"));
  docs.set(`memberEmails/${memberEmailLockId("ana@example.com")}`, { memberId: "ana" });
  docs.set("screenings/night", { status: "open", startsAt: Timestamp.now() });
  docs.set("system/openScreening", { screeningId: "night" });
  docs.set("movieBallots/night", { status: "closed" });
});

describe("admin reservation transaction", () => {
  it("assigns a member's own reservation, with an exemption but without a vote or admin +1", async () => {
    const result = await reserveSeatAsAdmin("admin", input());
    expect(result).toMatchObject({ personId: "ana", createdMember: false, exemptionGranted: true });
    expect(docs.get("screenings/night/reservations/ana")).toMatchObject({ kind: "self", memberId: "ana", bookedByMemberId: "admin", source: "admin", placeCode: "A1" });
    expect(docs.has("screenings/night/plusOnes/admin")).toBe(false);
    expect(docs.has("movieBallots/night/votes/ana")).toBe(false);
    await changeOwnSeat("night", { id: "ana" }, "B1");
    expect(docs.get("screenings/night/reservations/ana")?.placeCode).toBe("B1");
    await cancelOwnReservation("night", { id: "ana" });
    expect(docs.has("screenings/night/reservations/ana")).toBe(false);
    expect(docs.has("screenings/night/places/B1")).toBe(false);
  });
  it("lets the assigned member add their own guest and cancels only their party", async () => {
    await reserveSeatAsAdmin("admin", input());
    await reserveGuestSeat("night", { id: "ana" }, null, "Invitada de Ana", "A2");
    expect(docs.get("screenings/night/plusOnes/ana")?.placeCode).toBe("A2");
    expect(docs.has("screenings/night/plusOnes/admin")).toBe(false);
    await cancelOwnReservation("night", { id: "ana" });
    expect(docs.has("screenings/night/places/A2")).toBe(false);
    expect(docs.has("screenings/night/plusOnes/ana")).toBe(false);
  });
  it.each(["vote", "exemption", "no-ballot", "canceled"])("does not grant an unnecessary exemption: %s", async (scenario) => {
    if (scenario === "vote") docs.set("movieBallots/night/votes/ana", { optionId: "film" });
    else if (scenario === "exemption") docs.set("movieBallots/night/exemptions/ana", { grantedByMemberId: "original" });
    else if (scenario === "no-ballot") docs.delete("movieBallots/night");
    else docs.set("movieBallots/night", { status: scenario });
    expect((await reserveSeatAsAdmin("admin", input())).exemptionGranted).toBe(false);
    if (scenario === "exemption") expect(docs.get("movieBallots/night/exemptions/ana")?.grantedByMemberId).toBe("original");
  });
  it("supports independent named visitors, preserves names when moving and includes them in the critique", async () => {
    const a = await reserveSeatAsAdmin("admin", input({ mode: "name", name: "Visitante A" }));
    const b = await reserveSeatAsAdmin("admin", input({ mode: "name", name: "Visitante B" }, "A2"));
    expect(a.personId).not.toBe(b.personId);
    expect([...docs.keys()].filter((path) => path.startsWith("members/"))).toHaveLength(2);
    await changeOwnSeat("night", { id: a.personId }, "B1");
    expect(docs.get("screenings/night/places/B1")?.displayName).toBe("Visitante A");
    const session = await openCritiqueSession("night", { title: "Película", director: "Directora", year: 2020 });
    expect(session?.audience).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Visitante A", memberId: null })]));
    docs.set("screenings/night/plusOnes/admin", { reservationId: "unrelated-admin-guest" });
    await cancelOwnReservation("night", { id: a.personId });
    expect(docs.has("screenings/night/plusOnes/admin")).toBe(true);
    expect(docs.has(`screenings/night/reservations/${b.personId}`)).toBe(true);
  });
  it("creates a profile, email index, exemption and seat together", async () => {
    const result = await reserveSeatAsAdmin("admin", account());
    expect(result.createdMember).toBe(true);
    expect(docs.get(`members/${result.personId}`)).toMatchObject({ email: "nueva@example.com", authUid: null, active: true, createdByMemberId: "admin" });
    expect(docs.get(`memberEmails/${memberEmailLockId("nueva@example.com")}`)?.memberId).toBe(result.personId);
    expect(docs.has(`movieBallots/night/exemptions/${result.personId}`)).toBe(true);
    expect(docs.get("screenings/night/places/A1")?.memberId).toBe(result.personId);
  });
  it("preserves named visitors when a cancellation promotes them from the floor", async () => {
    await reserveSeatAsAdmin("admin", input());
    const visitor = await reserveSeatAsAdmin("admin", input({ mode: "name", name: "Visitante del piso" }, "P1"));
    await cancelOwnReservation("night", { id: "ana" });
    expect(docs.get("screenings/night/places/A1")).toMatchObject({ memberId: visitor.personId, displayName: "Visitante del piso", kind: "self", bookedByMemberId: "admin" });
    expect(docs.get(`screenings/night/reservations/${visitor.personId}`)).toMatchObject({ placeCode: "A1", source: "admin" });
    expect(docs.has("screenings/night/places/P1")).toBe(false);
  });
  it("reuses an existing email without renaming or creating a second profile", async () => {
    const result = await reserveSeatAsAdmin("admin", input({ mode: "account", name: "Otro nombre", email: "ana@example.com" }));
    expect(result).toMatchObject({ personId: "ana", name: "Ana", createdMember: false });
    expect([...docs.keys()].filter((path) => path.startsWith("members/"))).toHaveLength(2);
  });
  it.each(["blocked", "occupied", "closed", "pointer", "inactive-admin", "not-admin", "inactive-member", "waiting", "reserved"])("rejects %s without partial writes", async (scenario) => {
    let request = account();
    if (scenario === "blocked") docs.set("screenings/night/blocks/A1", {});
    if (scenario === "occupied") docs.set("screenings/night/places/A1", { memberId: "someone" });
    if (scenario === "closed") docs.set("screenings/night", { status: "closed" });
    if (scenario === "pointer") docs.set("system/openScreening", { screeningId: "other" });
    if (scenario === "inactive-admin") docs.set("members/admin", { role: "admin", active: false });
    if (scenario === "not-admin") docs.set("members/admin", { role: "member", active: true });
    if (["inactive-member", "waiting", "reserved"].includes(scenario)) request = input();
    if (scenario === "inactive-member") docs.set("members/ana", { active: false });
    if (scenario === "waiting") docs.set("screenings/night/waitlist/ana", {});
    if (scenario === "reserved") docs.set("screenings/night/reservations/ana", { placeCode: "B1" });
    const before = [...docs.entries()];
    await expect(reserveSeatAsAdmin("admin", request)).rejects.toThrow();
    expect([...docs.entries()]).toEqual(before);
  });
  it("replays the same request safely and rejects reuse for another operation", async () => {
    const request = input({ mode: "name", name: "Invitado" });
    const first = await reserveSeatAsAdmin("admin", request);
    const before = [...docs.entries()];
    expect(await reserveSeatAsAdmin("admin", request)).toEqual(first);
    await expect(reserveSeatAsAdmin("admin", { ...request, placeCode: "A2" })).rejects.toThrow(/operación/);
    expect([...docs.entries()]).toEqual(before);
  });
  it("rejects duplicate member and same-seat attempts, including the regular booking path", async () => {
    const results = await Promise.allSettled([
      reserveSeatAsAdmin("admin", input()),
      reserveOwnSeat("night", { id: "ana" }, "A1"),
      reserveSeatAsAdmin("admin", input({ mode: "member", memberId: "ana" }, "A2")),
      reserveSeatAsAdmin("admin", account()),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect([...docs.keys()].filter((path) => path.startsWith("screenings/night/reservations/"))).toHaveLength(1);
    expect(docs.has(`memberEmails/${memberEmailLockId("nueva@example.com")}`)).toBe(false);
  });
});

describe("first login for admin-provisioned profiles", () => {
  it("claims the existing stable profile, retaining reservations and preferences on subsequent logins", async () => {
    const result = await reserveSeatAsAdmin("admin", account());
    const preferences = `members/${result.personId}/recommendationPreferences/previous`;
    docs.set(preferences, { optionIds: ["pick-1"] });
    const member = await authorizeFirebaseIdentity(identity(" NUEVA@example.com "));
    expect(member?.id).toBe(result.personId);
    expect(docs.has("members/google-uid")).toBe(false);
    expect(docs.get(`members/${result.personId}`)?.authUid).toBe("google-uid");
    expect((await getMemberByFirebaseUid("google-uid"))?.id).toBe(result.personId);
    expect((await authorizeFirebaseIdentity(identity()))?.id).toBe(result.personId);
    expect(docs.get("screenings/night/places/A1")?.memberId).toBe(result.personId);
    expect(docs.get(preferences)).toEqual({ optionIds: ["pick-1"] });
    await changeOwnSeat("night", { id: member!.id }, "A2");
    expect(docs.get("screenings/night/places/A2")?.memberId).toBe(member!.id);
  });
  it("keeps normal UID-based logins working and requires invitations for unknown emails", async () => {
    expect((await authorizeFirebaseIdentity(identity("ana@example.com", "ana")))?.id).toBe("ana");
    expect((await getMemberByFirebaseUid("ana"))?.id).toBe("ana");
    await expect(authorizeFirebaseIdentity(identity())).rejects.toMatchObject({ code: "invitation-required" });
  });
  it.each(["inactive", "claimed", "wrong-email", "unprovisioned", "identity-conflict"])("does not claim an invalid profile: %s", async (scenario) => {
    const result = await reserveSeatAsAdmin("admin", account());
    const path = `members/${result.personId}`;
    const member = docs.get(path)!;
    if (scenario === "inactive") member.active = false;
    if (scenario === "claimed") member.authUid = "other-uid";
    if (scenario === "wrong-email") member.email = "someone@example.com";
    if (scenario === "unprovisioned") delete member.createdByMemberId;
    if (scenario === "identity-conflict") docs.set("memberIdentities/google-uid", { memberId: "another" });
    const before = [...docs.entries()];
    await expect(authorizeFirebaseIdentity(identity())).rejects.toMatchObject({ code: scenario === "inactive" ? "inactive-member" : "account-conflict" });
    expect([...docs.entries()]).toEqual(before);
    expect(await getMemberByFirebaseUid("google-uid")).toBeNull();
  });
  it("rejects a second Firebase identity after the profile has been claimed", async () => {
    await reserveSeatAsAdmin("admin", account());
    await authorizeFirebaseIdentity(identity());
    await expect(authorizeFirebaseIdentity(identity("nueva@example.com", "different-uid"))).rejects.toMatchObject({ code: "account-conflict" });
  });
});

describe("reservation input validation", () => {
  const form = () => {
    const data = new FormData();
    Object.entries({ screeningId: "night", placeCode: "P1", requestId: randomUUID(), mode: "account", name: " Nueva ", email: " NUEVA@Example.com " }).forEach(([key, value]) => data.set(key, value));
    return data;
  };
  it("normalizes names and emails and accepts floor spaces", () => {
    expect(parseAdminReservationInput(form())).toMatchObject({ placeCode: "P1", person: { mode: "account", name: "Nueva", email: "nueva@example.com" } });
  });
  it.each([["placeCode", "Z99"], ["screeningId", "a/b"], ["requestId", "-".repeat(36)], ["mode", "admin"], ["name", " "], ["email", "invalid"], ["email", "a@b"], ["email", "a@@b.com"]])("rejects %s=%s", (key, value) => {
    const data = form(); data.set(key, value);
    expect(() => parseAdminReservationInput(data)).toThrow();
  });
});
