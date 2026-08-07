import { describe, expect, it } from "vitest";

import {
  claimWaitlistSlot,
  releaseWaitlistSlots,
  WAITLIST_CAPACITY,
} from "./waitlist-policy";

describe("waitlist state", () => {
  it("assigns stable ascending order", () => {
    const first = claimWaitlistSlot(null);
    const second = claimWaitlistSlot(first.state);
    expect(first).toEqual({ order: 1, state: { count: 1, nextOrder: 1 } });
    expect(second).toEqual({ order: 2, state: { count: 2, nextOrder: 2 } });
  });

  it("never exceeds five people", () => {
    expect(WAITLIST_CAPACITY).toBe(5);
    expect(() => claimWaitlistSlot({ count: 5, nextOrder: 8 })).toThrow("cinco");
  });

  it("releases entries without reusing their order", () => {
    expect(releaseWaitlistSlots({ count: 3, nextOrder: 9 }, 2)).toEqual({
      count: 1,
      nextOrder: 9,
    });
  });
});
