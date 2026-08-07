import { createHash, randomBytes } from "node:crypto";

export const INVITATION_TTL_DAYS = 30;
export const MAX_INVITATION_BATCH = 20;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type InvitationLifecycle = {
  expiresAt: Date;
  revokedAt: Date | null;
  usedAt: Date | null;
};

export type InvitationStatus = "available" | "used" | "revoked" | "expired";

export function generateInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function isInvitationToken(token: string) {
  return TOKEN_PATTERN.test(token);
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiration(from = new Date()) {
  return new Date(from.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function invitationStatus(
  invitation: InvitationLifecycle,
  now = new Date(),
): InvitationStatus {
  if (invitation.usedAt) return "used";
  if (invitation.revokedAt) return "revoked";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "expired";
  return "available";
}

export function parseInvitationCount(value: FormDataEntryValue | null) {
  const count = Number(value);

  if (!Number.isInteger(count) || count < 1 || count > MAX_INVITATION_BATCH) {
    throw new Error(`La cantidad debe estar entre 1 y ${MAX_INVITATION_BATCH}.`);
  }

  return count;
}
