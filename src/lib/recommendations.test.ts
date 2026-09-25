import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

import { RECOMMENDATION_IDS, type RecommendationMovie } from "./recommendation-policy";
import { hashCritiqueAccess } from "./critique-access";

// Isolated transactional store: no credentials, network or production records.
const store = vi.hoisted(() => ({ documents: new Map<string, Record<string, unknown>>() }));
vi.mock("@/lib/firebase/admin", () => {
  const ref = (path: string) => ({
    path,
    id: path.split("/").at(-1),
    collection: (name: string) => collection(`${path}/${name}`),
    get: async () => snapshot(path),
    create: async (data: Record<string, unknown>) => {
      if (store.documents.has(path)) throw new Error("Already exists");
      store.documents.set(path, data);
    },
    update: async (data: Record<string, unknown>) => store.documents.set(path, { ...store.documents.get(path), ...data }),
  });
  const collection = (path: string) => ({
    path,
    query: true,
    doc: (id: string) => ref(`${path}/${id}`),
    get: async () => querySnapshot(path),
    add: async (data: Record<string, unknown>) => store.documents.set(`${path}/generated-${store.documents.size}`, data),
  });
  const snapshot = (path: string) => ({ id: path.split("/").at(-1), exists: store.documents.has(path), data: () => store.documents.get(path) });
  const querySnapshot = (path: string) => ({ docs: [...store.documents.keys()]
    .filter((key) => key.startsWith(`${path}/`) && key.split("/").length === path.split("/").length + 1)
    .map(snapshot) });
  return {
    getAdminFirestore: () => ({
      collection,
      getAll: async (...references: Array<{ path: string }>) => references.map((reference) => snapshot(reference.path)),
      runTransaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
        const writes: Array<() => void> = [];
        const result = await callback({
          get: async (reference: { path: string; query?: boolean }) => {
            if (writes.length) throw new Error("Firestore reads must precede writes");
            return reference.query ? querySnapshot(reference.path) : snapshot(reference.path);
          },
          create: (reference: { path: string }, data: Record<string, unknown>) => {
            if (store.documents.has(reference.path)) throw new Error("Already exists");
            writes.push(() => store.documents.set(reference.path, data));
          },
          set: (reference: { path: string }, data: Record<string, unknown>) => {
            writes.push(() => store.documents.set(reference.path, data));
          },
          update: (reference: { path: string }, data: Record<string, unknown>) => {
            writes.push(() => store.documents.set(reference.path, { ...store.documents.get(reference.path), ...data }));
          },
        });
        writes.forEach((write) => write());
        return result;
      },
    }),
  };
});

import {
  closeRecommendations,
  getPhoneRecommendations as readPhoneRecommendations,
  revealRecommendations,
  saveRecommendationMovie,
  submitRecommendationPreference as savePreference,
} from "./recommendations";
import { closeCritiqueSession, joinCritique, openCritiqueSession, submitCritiqueScores } from "./critiques";

const accessToken = "a".repeat(43);
const getPhoneRecommendations = (screeningId: string, personId: string | null) =>
  readPhoneRecommendations(screeningId, personId, undefined, accessToken);
const submitRecommendationPreference = (screeningId: string, personId: string, values: unknown[]) =>
  savePreference(screeningId, personId, values, accessToken);

const movies: RecommendationMovie[] = RECOMMENDATION_IDS.map((id, index) => ({
  id, title: `Película ${index + 1}`, director: "Directora", year: 2000,
  reason: "Una razón para verla.",
  image: { landscapePath: "landscape.webp", portraitPath: "portrait.webp", sourceWidth: 1920, sourceHeight: 1080, accent: "#fff" },
}));
const roundPath = "recommendations/night";
const preferencePath = "members/member-a/recommendationPreferences/night";

beforeEach(() => {
  store.documents.clear();
  store.documents.set("screenings/night", { title: "La función" });
  store.documents.set("critiques/night", { status: "closed", movieTitle: "La que vimos", screeningStartsAt: Timestamp.now() });
  store.documents.set(roundPath, { status: "draft", movies, counts: {}, respondentCount: 0, revision: 3 });
  store.documents.set("members/member-a", { active: true });
  store.documents.set("critiques/night/audience/member-a", {
    accessHash: hashCritiqueAccess(accessToken),
    memberId: "member-a", name: "Miembro", submittedAt: Timestamp.now(),
    scores: { fotografia: 9, sonido: 8, actuacion: 8, guion: 7, direccion: 8 },
  });
  store.documents.set("critiques/night/audience/external-guest", {
    accessHash: hashCritiqueAccess(accessToken),
    memberId: null, name: "Invitado", submittedAt: Timestamp.now(),
    scores: { fotografia: 7, sonido: 8, actuacion: 8, guion: 9, direccion: 8 },
  });
});

describe("recommendation lifecycle and member preferences", () => {
  it("preserves the QR → scoring → history flow before revealing recommendations", async () => {
    store.documents.delete("critiques/night");
    store.documents.delete("critiques/night/audience/member-a");
    store.documents.delete("critiques/night/audience/external-guest");
    store.documents.set("screenings/night", { startsAt: Timestamp.now() });
    store.documents.set("screenings/night/places/A1", { memberId: "member-a", kind: "self" });
    store.documents.set("members/member-a", { active: true, name: "Miembro" });
    const session = await openCritiqueSession("night", { title: "La que vimos", director: "Directora", year: 2020 });
    expect(session?.status).toBe("lobby");
    const joined = await joinCritique(session!.token, "member-a");
    expect(joined.session.status).toBe("scoring");
    expect(joined.accessToken).toHaveLength(43);
    await expect(joinCritique(session!.token, "member-a")).rejects.toThrow(/otro teléfono/);
    const rejoined = await joinCritique(session!.token, "member-a", joined.accessToken);
    expect(rejoined.accessToken).toBe(joined.accessToken);
    expect(rejoined.session.joinedCount).toBe(1);
    const scored = await submitCritiqueScores(session!.token, "member-a", {
      fotografia: 9, sonido: 8, actuacion: 8, guion: 7, direccion: 8,
    });
    expect(scored?.roomAverage).toBe(8);
    await expect(revealRecommendations("night")).rejects.toThrow(/puntajes/);
    await closeCritiqueSession("night");
    const historyBefore = [...store.documents.entries()].filter(([path]) => path.startsWith("filmHistory/"));
    expect(historyBefore).toHaveLength(1);
    expect(historyBefore[0][1]).toMatchObject({ score: 8, voterCount: 1 });
    await revealRecommendations("night");
    await savePreference("night", "member-a", ["pick-1", "pick-2", "pick-3"], joined.accessToken);
    await closeRecommendations("night");
    expect(store.documents.get(preferencePath)?.optionIds).toHaveLength(3);
    expect([...store.documents.entries()].filter(([path]) => path.startsWith("filmHistory/"))).toEqual(historyBefore);
    expect(store.documents.get("screenings/night/places/A1")).toEqual({ memberId: "member-a", kind: "self" });
    expect([...store.documents.keys()].some((path) => path.startsWith("movieBallots/"))).toBe(false);
  });
  it("requires the phone credential to read or change a persons preferences", async () => {
    await revealRecommendations("night");
    await expect(savePreference("night", "member-a", ["pick-1"], "b".repeat(43))).rejects.toThrow(/teléfono/);
    await expect(savePreference("night", "member-a", ["pick-1"])).rejects.toThrow(/teléfono/);
    expect(await readPhoneRecommendations("night", "member-a", undefined, "b".repeat(43))).toBeNull();
    expect(store.documents.has(preferencePath)).toBe(false);
  });
  it("hides drafts from phones, requires a closed critique, and reveals only on request", async () => {
    expect(await getPhoneRecommendations("night", "member-a")).toBeNull();
    await expect(submitRecommendationPreference("night", "member-a", ["pick-1"])).rejects.toThrow(/abierta/);
    store.documents.set("critiques/night", { status: "scoring" });
    await expect(revealRecommendations("night")).rejects.toThrow(/puntajes/);
    store.documents.set("critiques/night", { status: "closed" });
    await revealRecommendations("night");
    expect((await getPhoneRecommendations("night", "member-a"))?.round.status).toBe("open");
    expect(await getPhoneRecommendations("night", null)).toBeNull();
  });

  it("atomically saves member interests and updates counts without duplicating responses", async () => {
    await revealRecommendations("night");
    await submitRecommendationPreference("night", "member-a", ["pick-1", "pick-3"]);
    expect(store.documents.get(preferencePath)).toMatchObject({
      watchedTitle: "La que vimos", optionIds: ["pick-1", "pick-3"],
      critiqueScores: { fotografia: 9 },
    });
    expect(store.documents.get(preferencePath)?.offeredMovies).toHaveLength(3);
    const createdAt = store.documents.get(preferencePath)?.createdAt;
    await submitRecommendationPreference("night", "member-a", ["pick-2"]);
    await submitRecommendationPreference("night", "member-a", ["pick-2"]);
    expect(store.documents.get(roundPath)).toMatchObject({ respondentCount: 1, counts: { "pick-1": 0, "pick-2": 1, "pick-3": 0 } });
    expect(store.documents.get(preferencePath)?.movies).toEqual([{ id: "pick-2", title: "Película 2", director: "Directora", year: 2000 }]);
    expect(store.documents.get(preferencePath)?.createdAt).toBe(createdAt);
    expect((await getPhoneRecommendations("night", "member-a"))?.round.counts).toEqual({});
  });

  it("allows guests to choose all three without creating or changing a member profile", async () => {
    await revealRecommendations("night");
    await submitRecommendationPreference("night", "external-guest", [...RECOMMENDATION_IDS]);
    expect(store.documents.get(`${roundPath}/responses/external-guest`)).toMatchObject({ memberId: null, optionIds: RECOMMENDATION_IDS });
    expect(store.documents.has(preferencePath)).toBe(false);
    expect([...store.documents.keys()].filter((path) => path.startsWith("members/"))).toEqual(["members/member-a"]);
  });

  it("rejects nonparticipants, incomplete critiques and invalid selections without writes", async () => {
    await revealRecommendations("night");
    const original = store.documents.get(roundPath);
    await expect(submitRecommendationPreference("night", "stranger", ["pick-1"])).rejects.toThrow(/crítica/);
    await expect(submitRecommendationPreference("night", "member-a", [])).rejects.toThrow(/Elegí/);
    await expect(submitRecommendationPreference("night", "member-a", ["pick-1", "pick-1"])).rejects.toThrow(/selección/);
    store.documents.set("critiques/night/audience/member-a", { memberId: "member-a", submittedAt: null });
    await expect(submitRecommendationPreference("night", "member-a", ["pick-1"])).rejects.toThrow(/crítica/);
    expect(store.documents.get(roundPath)).toBe(original);
    expect(store.documents.has(preferencePath)).toBe(false);
  });

  it("freezes films on reveal and preferences on close, preserving final results", async () => {
    await revealRecommendations("night");
    await expect(saveRecommendationMovie("night", movies[0], 3)).rejects.toThrow(/reemplazar/);
    await submitRecommendationPreference("night", "member-a", ["pick-1"]);
    await closeRecommendations("night");
    await closeRecommendations("night");
    await expect(submitRecommendationPreference("night", "member-a", ["pick-2"])).rejects.toThrow(/abierta/);
    await expect(revealRecommendations("night")).rejects.toThrow(/terminó/);
    expect(store.documents.get(preferencePath)?.optionIds).toEqual(["pick-1"]);
    expect((await getPhoneRecommendations("night", "member-a"))?.selection).toEqual(["pick-1"]);
  });

  it("protects a draft from a save based on a stale revision", async () => {
    await saveRecommendationMovie("night", { ...movies[0], title: "Nueva" }, 3);
    await expect(saveRecommendationMovie("night", movies[1], 3)).rejects.toThrow(/otra pantalla/);
    expect(store.documents.get(roundPath)?.revision).toBe(4);
  });
});
