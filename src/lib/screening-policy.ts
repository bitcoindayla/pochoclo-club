export const CLUB_TIME_ZONE = "America/Argentina/Mendoza";

export type ScreeningInput = {
  localDate: string;
  localTime: string;
  title: string | null;
  message: string | null;
  startsAt: Date;
};

function optionalText(value: FormDataEntryValue | null, maximum: number, label: string) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (text.length > maximum) {
    throw new Error(`${label} puede tener hasta ${maximum} caracteres.`);
  }
  return text;
}

function zonedParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

function offsetAt(date: Date) {
  const parts = zonedParts(date);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function localScreeningDate(dateValue: string, timeValue: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!dateMatch || !timeMatch) throw new Error("Elegí una fecha y un horario válidos.");

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const local = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  };
  if (
    local.month < 1 ||
    local.month > 12 ||
    local.day < 1 ||
    local.day > 31 ||
    local.hour > 23 ||
    local.minute > 59
  ) {
    throw new Error("Elegí una fecha y un horario válidos.");
  }

  const localAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );
  let instant = new Date(localAsUtc);
  instant = new Date(localAsUtc - offsetAt(instant));
  instant = new Date(localAsUtc - offsetAt(instant));

  const result = zonedParts(instant);
  if (
    result.year !== local.year ||
    result.month !== local.month ||
    result.day !== local.day ||
    result.hour !== local.hour ||
    result.minute !== local.minute
  ) {
    throw new Error("Elegí una fecha y un horario válidos.");
  }
  return instant;
}

export function parseScreeningInput(formData: FormData, now = new Date()): ScreeningInput {
  const localDate = formData.get("date");
  const localTime = formData.get("time");
  if (typeof localDate !== "string" || typeof localTime !== "string") {
    throw new Error("Elegí una fecha y un horario.");
  }

  const startsAt = localScreeningDate(localDate, localTime);
  if (startsAt.getTime() <= now.getTime()) {
    throw new Error("La función tiene que ser en el futuro.");
  }

  return {
    localDate,
    localTime,
    title: optionalText(formData.get("title"), 120, "El título"),
    message: optionalText(formData.get("message"), 500, "El mensaje"),
    startsAt,
  };
}
