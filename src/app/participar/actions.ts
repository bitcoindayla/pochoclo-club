"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { createTasteInvitation } from "@/lib/invitations";

export type TasteInviteState = {
  error: string | null;
  url: string | null;
};

function inviteOrigin(requestHeaders: Headers) {
  const configured = process.env.APP_URL;
  if (configured) return configured;
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://pochoclo.club";
}

function clientKey(requestHeaders: Headers) {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`taste-gate:${ip}`).digest("hex").slice(0, 32);
}

export async function requestTasteInviteAction(filmIds: string[]): Promise<TasteInviteState> {
  try {
    const requestHeaders = await headers();
    const invitation = await createTasteInvitation(filmIds, clientKey(requestHeaders));
    const url = new URL(`/invite/${invitation.token}`, inviteOrigin(requestHeaders)).toString();
    return { error: null, url };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No pudimos armar el pase.",
      url: null,
    };
  }
}
