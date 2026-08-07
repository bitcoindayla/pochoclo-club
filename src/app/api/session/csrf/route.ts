import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { CSRF_COOKIE } from "@/lib/session";

export function GET() {
  const token = randomBytes(32).toString("base64url");
  const response = NextResponse.json(
    { token },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });
  return response;
}
