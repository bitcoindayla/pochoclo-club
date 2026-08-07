import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminAuth } from "@/lib/firebase/admin";
import { getMemberById } from "@/lib/members";
import { SESSION_COOKIE } from "@/lib/session";

export async function getCurrentMember() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const identity = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    const member = await getMemberById(identity.uid);
    return member?.active ? member : null;
  } catch {
    return null;
  }
}

export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) redirect("/");
  return member;
}

export async function requireAdmin() {
  const member = await requireMember();
  if (member.role !== "admin") redirect("/club");
  return member;
}
