export const WAITLIST_CAPACITY = 5;

export type WaitlistState = {
  count: number;
  nextOrder: number;
};

export class WaitlistFullError extends Error {
  constructor() {
    super("La lista de espera ya tiene cinco personas.");
    this.name = "WaitlistFullError";
  }
}

function safeState(value: Partial<WaitlistState> | null | undefined): WaitlistState {
  return {
    count: Number.isInteger(value?.count) && (value?.count ?? 0) >= 0 ? value!.count! : 0,
    nextOrder:
      Number.isInteger(value?.nextOrder) && (value?.nextOrder ?? 0) >= 0
        ? value!.nextOrder!
        : 0,
  };
}

export function claimWaitlistSlot(value?: Partial<WaitlistState> | null) {
  const current = safeState(value);
  if (current.count >= WAITLIST_CAPACITY) throw new WaitlistFullError();
  const order = current.nextOrder + 1;
  return {
    order,
    state: { count: current.count + 1, nextOrder: order } satisfies WaitlistState,
  };
}

export function releaseWaitlistSlots(
  value: Partial<WaitlistState> | null | undefined,
  released = 1,
) {
  const current = safeState(value);
  const safeReleased = Number.isInteger(released) && released > 0 ? released : 0;
  return {
    count: Math.max(0, current.count - safeReleased),
    nextOrder: current.nextOrder,
  } satisfies WaitlistState;
}
