import { NextResponse } from "next/server";

import { getCurrentMember } from "@/lib/authz";
import { getCritiqueSession } from "@/lib/critiques";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (member?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const screeningId = new URL(request.url).searchParams.get("screeningId");
  if (!screeningId) return NextResponse.json({ error: "Función inválida." }, { status: 400 });
  const session = await getCritiqueSession(screeningId);
  if (!session) return NextResponse.json({ error: "No hay crítica." }, { status: 404 });
  return NextResponse.json(session);
}
