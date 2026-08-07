import { describe, expect, it } from "vitest";

import {
  planScreeningClosure,
  planScreeningOpening,
} from "./screening-lifecycle-policy";

describe("screening closure", () => {
  it("closes only the function currently visible to the club", () => {
    expect(
      planScreeningClosure({
        screeningId: "screening-a",
        status: "open",
        currentScreeningId: "screening-a",
      }),
    ).toBe("close");

    expect(() =>
      planScreeningClosure({
        screeningId: "screening-a",
        status: "open",
        currentScreeningId: "screening-b",
      }),
    ).toThrow("visible");
  });

  it("is idempotent and does not allow closing a draft", () => {
    expect(
      planScreeningClosure({
        screeningId: "screening-a",
        status: "closed",
        currentScreeningId: "screening-a",
      }),
    ).toBe("already-closed");

    expect(() =>
      planScreeningClosure({
        screeningId: "screening-a",
        status: "draft",
        currentScreeningId: "screening-a",
      }),
    ).toThrow("abierta");
  });
});

describe("screening opening", () => {
  it("allows a new draft after the previous function was closed", () => {
    expect(
      planScreeningOpening({
        screeningId: "new-screening",
        status: "draft",
        currentScreeningId: "old-screening",
        currentScreeningStatus: "closed",
      }),
    ).toBe("open");
  });

  it("does not reopen a closed function or replace another open one", () => {
    expect(() =>
      planScreeningOpening({
        screeningId: "old-screening",
        status: "closed",
        currentScreeningId: "old-screening",
        currentScreeningStatus: "closed",
      }),
    ).toThrow("volver a abrir");

    expect(() =>
      planScreeningOpening({
        screeningId: "new-screening",
        status: "draft",
        currentScreeningId: "active-screening",
        currentScreeningStatus: "open",
      }),
    ).toThrow("otra función");
  });
});
