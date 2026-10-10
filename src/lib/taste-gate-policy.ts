export const TASTE_GATE_MIN_FILMS = 10;
export const TASTE_GATE_MAX_FILMS = 40;
export const TASTE_GATE_DAILY_CAP = 3;
export const TASTE_GATE_CREATOR = "taste-gate";

const FILM_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function parseTasteFilmIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Marcá las pelis que viste.");
  }

  const ids = [
    ...new Set(
      value.filter((id): id is string => typeof id === "string" && FILM_ID.test(id)),
    ),
  ];

  if (ids.length < TASTE_GATE_MIN_FILMS) {
    throw new Error("Marcá por lo menos diez pelis que hayas visto.");
  }
  if (ids.length > TASTE_GATE_MAX_FILMS) {
    throw new Error("Demasiadas de una. Quedate con las que más te marcaron.");
  }

  return ids;
}

export function tasteGateDay(
  now = new Date(),
  timeZone = "America/Argentina/Mendoza",
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function tasteProgressCopy(count: number, min = TASTE_GATE_MIN_FILMS) {
  if (count <= 0) return "Tocá las pelis que ya viste. Diez coincidencias y hay lugar.";
  if (count >= min) return "Diez en común. Hay un lugar para vos.";
  if (count < 4) return `${count} de ${min}. Seguí, sin vueltas.`;
  if (count < 7) return `${count} de ${min}. Ya hay onda.`;
  const left = min - count;
  return left === 1 ? "Una más y te abrimos la puerta." : `Te faltan ${left}. El pochoclo se calienta.`;
}
