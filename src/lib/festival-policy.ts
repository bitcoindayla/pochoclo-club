export const FESTIVAL_IDS = ["cannes", "venice", "oscar", "sansebastian"] as const;

export type FestivalId = (typeof FESTIVAL_IDS)[number];
export type FestivalResult = "won" | "nominated";
export type FestivalMark = { id: FestivalId; result: FestivalResult };

export const FESTIVAL_NAMES: Record<FestivalId, string> = {
  cannes: "Cannes",
  venice: "Venecia",
  oscar: "los Oscars",
  sansebastian: "San Sebastián",
};

const AWARD_FESTIVALS: Record<string, FestivalId> = {
  Q102427: "oscar",
  Q41417: "oscar",
  Q103618: "oscar",
  Q103916: "oscar",
  Q103360: "oscar",
  Q281939: "oscar",
  Q106301: "oscar",
  Q106291: "oscar",
  Q131520: "oscar",
  Q277536: "oscar",
  Q487136: "oscar",
  Q830079: "oscar",
  Q227528: "oscar",
  Q103579: "oscar",
  Q179808: "cannes",
  Q844784: "cannes",
  Q507057: "cannes",
  Q514407: "cannes",
  Q687048: "cannes",
  Q725932: "cannes",
  Q2159561: "cannes",
  Q1545276: "cannes",
  Q209459: "venice",
  Q944480: "venice",
  Q1088624: "venice",
  Q1169799: "sansebastian",
  Q3477036: "sansebastian",
};

const ORG_FESTIVALS: Record<string, FestivalId> = {
  Q19020: "oscar",
  Q215130: "oscar",
  Q163536: "cannes",
  Q1115560: "cannes",
  Q182090: "venice",
  Q129390: "sansebastian",
};

export const KNOWN_FESTIVAL_MARKS: Record<string, FestivalMark[]> = {
  tt13238346: [{ id: "oscar", result: "nominated" }],
  tt4016934: [{ id: "cannes", result: "won" }],
  tt5083738: [
    { id: "venice", result: "won" },
    { id: "oscar", result: "won" },
  ],
  tt8613070: [
    { id: "cannes", result: "won" },
    { id: "sansebastian", result: "nominated" },
  ],
  tt14444726: [
    { id: "venice", result: "won" },
    { id: "oscar", result: "nominated" },
  ],
};

export function isFestivalId(value: string): value is FestivalId {
  return (FESTIVAL_IDS as readonly string[]).includes(value);
}

export function festivalMarkLabel(mark: FestivalMark) {
  const name = FESTIVAL_NAMES[mark.id];
  return mark.result === "won" ? `Ganó en ${name}` : `Nominada en ${name}`;
}

export function festivalMarksKey(marks: FestivalMark[] | null | undefined) {
  return mergeFestivalMarks(marks ?? [])
    .map((mark) => `${mark.id}:${mark.result}`)
    .join(",");
}

export function parseFestivalMarks(value: unknown): FestivalMark[] {
  if (!Array.isArray(value)) return [];
  const marks: FestivalMark[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as { id?: unknown }).id;
    const result = (entry as { result?: unknown }).result;
    if (typeof id !== "string" || !isFestivalId(id)) continue;
    if (result !== "won" && result !== "nominated") continue;
    marks.push({ id, result });
  }
  return mergeFestivalMarks(marks);
}

export function mergeFestivalMarks(marks: FestivalMark[]): FestivalMark[] {
  const best = new Map<FestivalId, FestivalResult>();
  for (const mark of marks) {
    if (!isFestivalId(mark.id)) continue;
    if (mark.result !== "won" && mark.result !== "nominated") continue;
    const current = best.get(mark.id);
    if (!current || (mark.result === "won" && current === "nominated")) {
      best.set(mark.id, mark.result);
    }
  }
  return FESTIVAL_IDS.filter((id) => best.has(id)).map((id) => ({
    id,
    result: best.get(id)!,
  }));
}

export function catalogFestivalMarks(imdbId?: string | null) {
  if (!imdbId) return [];
  return mergeFestivalMarks(KNOWN_FESTIVAL_MARKS[imdbId] ?? []);
}

export type FestivalAwardHint = {
  qid?: string | null;
  result: FestivalResult;
  labels: string[];
  orgQids?: string[];
};

function normalizeAwardText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function festivalFromAwardHint(hint: FestivalAwardHint): FestivalId | null {
  const qid = hint.qid?.trim();
  if (qid && AWARD_FESTIVALS[qid]) return AWARD_FESTIVALS[qid];
  for (const org of hint.orgQids ?? []) {
    if (ORG_FESTIVALS[org]) return ORG_FESTIVALS[org];
  }

  const text = normalizeAwardText(hint.labels.filter(Boolean).join(" "));
  if (!text) return null;
  if (/\bacademy award\b|\boscar\b/.test(text)) return "oscar";
  if (
    /\bpalme\b|\bcannes\b|\bqueer palm\b|\bvulcan award\b|\bcst award\b|\bcamera d or\b|\bun certain regard\b/.test(
      text,
    )
  ) {
    return "cannes";
  }
  if (
    /\bgolden lion\b|\bsilver lion\b|\bvolpi\b|\bqueer lion\b|\bvenice film festival\b|\bvenice international film festival\b/.test(
      text,
    )
  ) {
    return "venice";
  }
  if (
    /\bsan sebastian\b|\bdonostia\b|\bconcha de oro\b|\bconcha de plata\b|\bgolden shell\b|\bsilver shell\b|\bsebastiane\b/.test(
      text,
    )
  ) {
    return "sansebastian";
  }
  return null;
}

export function marksFromAwardHints(hints: FestivalAwardHint[]) {
  return mergeFestivalMarks(
    hints.flatMap((hint) => {
      const id = festivalFromAwardHint(hint);
      return id ? [{ id, result: hint.result }] : [];
    }),
  );
}
