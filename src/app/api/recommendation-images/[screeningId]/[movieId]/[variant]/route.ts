import { cookies } from "next/headers";

import { getCurrentMember } from "@/lib/authz";
import { hashCritiqueToken, isCritiqueToken } from "@/lib/critique-policy";
import { hasCritiqueAccess } from "@/lib/critique-access";
import { parseCritiqueCookie } from "@/lib/critiques";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { downloadRecommendationImage } from "@/lib/recommendation-images";
import { getRecommendationRound } from "@/lib/recommendations";
import { CRITIQUE_ACCESS_COOKIE, CRITIQUE_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request, context: {
  params: Promise<{ screeningId: string; movieId: string; variant: string }>;
}) {
  const { screeningId, movieId, variant } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(screeningId) || !/^pick-[1-3]$/.test(movieId) || !["landscape", "portrait"].includes(variant)) {
    return new Response("Imagen inválida", { status: 400 });
  }
  const member = await getCurrentMember();
  if (member?.role !== "admin") {
    const token = new URL(request.url).searchParams.get("token");
    const personId = parseCritiqueCookie((await cookies()).get(CRITIQUE_COOKIE)?.value, screeningId);
    if (!token || !isCritiqueToken(token) || !personId || personId.includes("/")) {
      return new Response("No autorizado", { status: 401 });
    }
    const firestore = getAdminFirestore();
    const [pointer, audience] = await Promise.all([
      firestore.collection("critiqueTokens").doc(hashCritiqueToken(token)).get(),
      firestore.collection("critiques").doc(screeningId).collection("audience").doc(personId).get(),
    ]);
    if (pointer.data()?.screeningId !== screeningId || !audience.data()?.submittedAt ||
      !hasCritiqueAccess((await cookies()).get(CRITIQUE_ACCESS_COOKIE)?.value, audience.data()?.accessHash)) {
      return new Response("No autorizado", { status: 401 });
    }
  }
  const round = await getRecommendationRound(screeningId);
  if (!round || (round.status === "draft" && member?.role !== "admin")) {
    return new Response("No encontrada", { status: 404 });
  }
  const image = round.movies.find((movie) => movie.id === movieId)?.image;
  const path = variant === "landscape" ? image?.landscapePath : image?.portraitPath;
  if (!path) return new Response("No encontrada", { status: 404 });
  try {
    const buffer = await downloadRecommendationImage(path);
    return new Response(new Uint8Array(buffer), { headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch { return new Response("No encontrada", { status: 404 }); }
}
