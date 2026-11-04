import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cookie: null as string | null,
  counts: null as Record<string, unknown> | null,
  voters: new Map<string, { filmIds: string[] }>(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => {
    const snapshot = (data: Record<string, unknown> | undefined) => ({
      exists: Boolean(data),
      data: () => data,
    });
    const countsRef = {
      kind: "counts",
      get: async () => snapshot(state.counts ?? undefined),
    };
    const voterRef = (id: string) => ({
      kind: "voter",
      id,
      get: async () => snapshot(state.voters.get(id)),
    });
    return {
      doc: () => countsRef,
      collection: () => ({
        doc: (id: string) => voterRef(id),
      }),
      runTransaction: async (callback: (transaction: {
        get: (ref: { kind: string; id?: string }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
        set: (ref: { kind: string; id?: string }, data: Record<string, unknown>) => void;
      }) => Promise<unknown>) =>
        callback({
          get: async (ref) => {
            if (ref.kind === "counts") return snapshot(state.counts ?? undefined);
            return snapshot(ref.id ? state.voters.get(ref.id) : undefined);
          },
          set: (ref, data) => {
            if (ref.kind === "counts") {
              state.counts = { ...(state.counts ?? {}), ...data };
              return;
            }
            if (ref.id) state.voters.set(ref.id, data as { filmIds: string[] });
          },
        }),
    };
  },
}));

import { getSalaListState, toggleSalaListVote } from "./sala-list";

const voter = "2c7e1c5a-3b2a-4f11-9c4d-8a6b0e1f2a3b";

beforeEach(() => {
  state.cookie = null;
  state.counts = null;
  state.voters = new Map();
});

describe("sala list persistence", () => {
  it("starts empty for a new browser", async () => {
    await expect(getSalaListState()).resolves.toEqual({ counts: {}, votedIds: [] });
  });

  it("toggles a title and remembers it on the voter", async () => {
    const added = await toggleSalaListVote(voter, "parasite");
    expect(added).toEqual({ filmId: "parasite", voted: true, count: 1 });
    state.cookie = voter;
    await expect(getSalaListState()).resolves.toEqual({
      counts: { parasite: 1 },
      votedIds: ["parasite"],
    });

    const removed = await toggleSalaListVote(voter, "parasite");
    expect(removed).toEqual({ filmId: "parasite", voted: false, count: 0 });
  });

  it("rejects an unknown film and a broken voter", async () => {
    await expect(toggleSalaListVote(voter, "inception")).rejects.toThrow(/lista/);
    await expect(toggleSalaListVote("nope", "parasite")).rejects.toThrow(/anotar/);
  });
});
