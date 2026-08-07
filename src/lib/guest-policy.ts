export class GuestNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuestNameError";
  }
}

export function parseGuestName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new GuestNameError("Escribí el nombre de tu +1.");
  }
  const name = value.trim();
  if (name.length > 100) {
    throw new GuestNameError("El nombre puede tener hasta 100 caracteres.");
  }
  return name;
}
