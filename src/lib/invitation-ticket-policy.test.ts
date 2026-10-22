import { describe, expect, it } from "vitest";

import {
  formatInvitationExpiry,
  invitationSerial,
  invitationTicketPath,
  invitationTicketShareText,
  INVITE_TICKET_FIELDS,
} from "./invitation-ticket-policy";

const token = "A".repeat(43);

describe("invitation ticket", () => {
  it("builds a short cinema serial from the invitation id", () => {
    expect(invitationSerial("a1b2c3d4e5f67890".padEnd(64, "0"))).toBe("PC-A1B2C3D4");
    expect(invitationSerial("a1b2c3d4e5f67890".padEnd(64, "0"))).toMatch(/^PC-[A-F0-9]{8}$/);
  });

  it("points the image route at the bearer token", () => {
    expect(invitationTicketPath(token)).toBe(`/api/invite-ticket/${token}`);
  });

  it("writes WhatsApp copy with a single invite link", () => {
    const url = "https://pochoclo.club/invite/abc";
    const text = invitationTicketShareText({
      url,
      expiresAt: new Date("2026-11-12T12:00:00.000Z"),
    });
    expect(text).toMatch(/Hay un lugar para vos/);
    expect(text).toContain(url);
    expect(text.match(/pochoclo\.club/g)).toHaveLength(1);
    expect(text).toMatch(/Vence el /);
  });

  it("formats the expiry in Mendoza", () => {
    expect(formatInvitationExpiry(new Date("2026-11-12T03:00:00.000Z"))).toBe("12 nov 2026");
  });

  it("keeps generic cinema fields on the golden pass", () => {
    expect(INVITE_TICKET_FIELDS.admit).toBe("Admit one");
    expect(INVITE_TICKET_FIELDS.ciudad).toBe("Mendoza");
    expect(INVITE_TICKET_FIELDS.funcion).toBe("Domingo 20:00");
    expect(INVITE_TICKET_FIELDS.footer).toMatch(/14 asientos/);
  });
});
