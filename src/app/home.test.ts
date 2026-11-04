import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ live: false, getDirectors: vi.fn(async () => []) }));
vi.stubGlobal("React", React);
vi.mock("@/lib/authz", () => ({ getCurrentMember: async () => null }));
vi.mock("@/lib/landing", () => ({ getLandingVisual: async () => ({
  version: "original", accent: "#d0ad4c", landscapeUrl: "/original-photo.jpg", movie: null,
}) }));
vi.mock("@/lib/landing-directors", () => ({
  hasLiveLandingBallot: async () => state.live,
  getLandingDirectors: state.getDirectors,
}));
vi.mock("@/lib/landing-stats", () => ({
  getLandingStats: async () => ({ functionsCount: 46, people: 460 }),
}));
vi.mock("@/lib/sala-list", () => ({
  getSalaListState: async () => ({ counts: {}, votedIds: [] }),
}));
vi.mock("@/components/landing-refresh", () => ({ LandingRefresh: () => null }));
vi.mock("@/components/sala-list", () => ({
  SalaList: () => React.createElement("div", { "data-sala-list": true }, "La lista que pide sala"),
}));
vi.mock("@/components/landing-access", () => ({ LandingAccess: () => React.createElement("button", null, "Ya soy miembro") }));
vi.mock("@/components/landing-photo-editor", () => ({ LandingPhotoEditor: () => null }));
vi.mock("@/components/landing-wordmark", () => ({ LandingWordmark: () => null }));
vi.mock("@/components/site-menu", () => ({ SiteMenu: () => null }));

import Home from "./page";

describe("home switches with the ballot", () => {
  beforeEach(() => { state.live = false; vi.clearAllMocks(); });
  it("shows the pending list and member access between ballots", async () => {
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("directorLanding");
    expect(html).toContain("data-sala-list");
    expect(html).toContain("La lista que pide sala");
    expect(html).toContain("Ya soy miembro");
    expect(html).toContain("Otra mirada, algo nos queda.");
    expect(html).toContain("46 FUNCIONES | 460 ESPECTADORES");
    expect(html).not.toContain("landingStill");
    expect(html).not.toContain("data-mosaic");
  });
  it("restores the existing photo and voting copy when a ballot opens", async () => {
    state.live = true;
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("landingStage");
    expect(html).toContain("Votá la próxima película.");
    expect(html).toContain("/original-photo.jpg");
    expect(html).not.toContain("data-sala-list");
    expect(state.getDirectors).not.toHaveBeenCalled();
  });
});
