import { createHash, timingSafeEqual } from "node:crypto";

export function hashCritiqueAccess(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hasCritiqueAccess(token: string | undefined, hash: unknown) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token) || typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(Buffer.from(hashCritiqueAccess(token), "hex"), Buffer.from(hash, "hex"));
}
