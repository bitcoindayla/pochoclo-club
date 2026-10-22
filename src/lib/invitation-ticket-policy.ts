export const INVITE_TICKET_WIDTH = 720;
export const INVITE_TICKET_HEIGHT = 1200;

export const INVITE_TICKET_FIELDS = {
  admit: "Admit one",
  sala: "Privada",
  ciudad: "Mendoza",
  funcion: "Domingo 20:00",
  butaca: "A confirmar",
  footer: "Cine por invitación · 14 asientos",
} as const;

export function invitationSerial(invitationId: string) {
  return `PC-${invitationId.slice(0, 8).toUpperCase()}`;
}

export function invitationTicketPath(token: string) {
  return `/api/invite-ticket/${encodeURIComponent(token)}`;
}

export function formatInvitationExpiry(
  expiresAt: Date,
  timeZone = "America/Argentina/Mendoza",
) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  })
    .format(expiresAt)
    .replace(/\s+de\s+/g, " ");
}

export function invitationTicketShareText({
  url,
  expiresAt,
}: {
  url: string;
  expiresAt: Date;
}) {
  return [
    "Hay un lugar para vos en Pochoclo Club.",
    "",
    "Cine por invitación, sala privada en Mendoza. Este es tu pase:",
    url,
    "",
    `Vence el ${formatInvitationExpiry(expiresAt)}. Entrá con Google; es de una sola vez.`,
  ].join("\n");
}
