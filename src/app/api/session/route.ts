import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import { getAdminAuth } from "@/lib/firebase/admin";
import {
  authorizeFirebaseIdentity,
  MembershipError,
} from "@/lib/members";
import { CSRF_COOKIE, SESSION_COOKIE } from "@/lib/session";

const SESSION_DURATION_SECONDS = 5 * 24 * 60 * 60;
const MAX_AUTH_AGE_SECONDS = 5 * 60;

function tokensMatch(received: unknown, expected: string | undefined) {
  if (typeof received !== "string" || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ code: "invalid-request" }, { status: 403 });
  }

  let body: { idToken?: unknown; invitationToken?: unknown; csrfToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid-request" }, { status: 400 });
  }

  const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
  if (!tokensMatch(body.csrfToken, csrfCookie)) {
    return NextResponse.json({ code: "invalid-request" }, { status: 403 });
  }
  if (typeof body.idToken !== "string") {
    return NextResponse.json({ code: "invalid-request" }, { status: 400 });
  }

  try {
    const adminAuth = getAdminAuth();
    const identity = await adminAuth.verifyIdToken(body.idToken, true);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      identity.email_verified !== true ||
      !identity.email ||
      nowSeconds - identity.auth_time > MAX_AUTH_AGE_SECONDS
    ) {
      return NextResponse.json({ code: "unverified-account" }, { status: 403 });
    }

    await authorizeFirebaseIdentity(
      {
        uid: identity.uid,
        email: identity.email,
        name: identity.name ?? null,
        imageUrl: identity.picture ?? null,
      },
      typeof body.invitationToken === "string" ? body.invitationToken : undefined,
    );

    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_DURATION_SECONDS * 1000,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });
    response.cookies.delete(CSRF_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof MembershipError) {
      return NextResponse.json({ code: error.code }, { status: 403 });
    }
    console.error("No se pudo crear la sesión de Firebase.", error);
    return NextResponse.json({ code: "session-error" }, { status: 500 });
  }
}
