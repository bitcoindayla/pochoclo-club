import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/authz";
import { critiqueQrSvg } from "@/lib/critique-qr";
import { getCritiqueSession } from "@/lib/critiques";
import { getOpenScreeningForMember } from "@/lib/screenings";

import { CritiqueBoard } from "../board";

export const metadata: Metadata = { title: "Sala de crítica" };

async function publicOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  if (!host) return "https://pochoclo.club";
  return `${proto}://${host}`;
}

export default async function CritiqueSalaPage() {
  const admin = await requireAdmin();
  const screening = await getOpenScreeningForMember(admin.id);
  if (!screening) redirect("/admin/critica");
  const session = await getCritiqueSession(screening.id);
  if (!session) redirect("/admin/critica");

  const scoreUrl = `${await publicOrigin()}/c/${session.token}`;
  const qrSvg = await critiqueQrSvg(scoreUrl);

  return <CritiqueBoard initialSession={session} qrSvg={qrSvg} scoreUrl={scoreUrl} />;
}
