export type LifecycleStatus = "draft" | "open" | "closed";

export class ScreeningLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreeningLifecycleError";
  }
}

export function planScreeningOpening({
  screeningId,
  status,
  currentScreeningId,
  currentScreeningStatus,
}: {
  screeningId: string;
  status: LifecycleStatus;
  currentScreeningId: unknown;
  currentScreeningStatus: LifecycleStatus | null;
}) {
  if (status === "closed") {
    throw new ScreeningLifecycleError("Una función cerrada no se puede volver a abrir.");
  }
  if (
    typeof currentScreeningId === "string" &&
    currentScreeningId !== screeningId &&
    currentScreeningStatus === "open"
  ) {
    throw new ScreeningLifecycleError("Ya hay otra función abierta.");
  }
  if (status === "open" && currentScreeningId === screeningId) {
    return "already-open" as const;
  }
  return "open" as const;
}

export function planScreeningClosure({
  screeningId,
  status,
  currentScreeningId,
}: {
  screeningId: string;
  status: LifecycleStatus;
  currentScreeningId: unknown;
}) {
  if (currentScreeningId !== screeningId) {
    throw new ScreeningLifecycleError("Esa ya no es la función visible del club.");
  }
  if (status === "closed") return "already-closed" as const;
  if (status !== "open") {
    throw new ScreeningLifecycleError("Solamente se puede cerrar una función abierta.");
  }
  return "close" as const;
}
