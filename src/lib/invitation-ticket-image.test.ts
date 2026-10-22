import { writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { hashInvitationToken } from "./invitation-policy";
import {
  invitationTicketImage,
  loadInvitationTicketAssets,
} from "./invitation-ticket-image";
import { invitationSerial } from "./invitation-ticket-policy";

const token = "A".repeat(43);

describe("invitation ticket image", () => {
  it("renders a golden cinema pass png", async () => {
    const { bear, qr } = await loadInvitationTicketAssets(
      `https://pochoclo.club/invite/${token}`,
    );
    const image = invitationTicketImage({
      serial: invitationSerial(hashInvitationToken(token)),
      expiresLabel: "12 nov 2026",
      status: "available",
      bear,
      qr,
    });
    const bytes = Buffer.from(await image.arrayBuffer());
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    await writeFile("/tmp/pochoclo-invite-ticket.png", bytes);
  }, 30_000);
});
