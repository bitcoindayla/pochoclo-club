import { getAdminFirestore } from "@/lib/firebase/admin";
import { downloadEssayImage } from "@/lib/essay-images";
import { isFilmHistoryId, parseEssayImage } from "@/lib/essay-policy";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ filmId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { filmId } = await context.params;
  const variant = new URL(request.url).searchParams.get("variant") ?? "landscape";
  if (!isFilmHistoryId(filmId) || (variant !== "landscape" && variant !== "portrait")) {
    return new Response("Imagen inválida", { status: 400 });
  }

  const snapshot = await getAdminFirestore().collection("filmHistory").doc(filmId).get();
  if (!snapshot.exists) return new Response("No encontrada", { status: 404 });
  const image = parseEssayImage((snapshot.data() as { essayImage?: unknown }).essayImage);
  const path = variant === "portrait" ? image?.portraitPath : image?.landscapePath;
  if (!path) return new Response("No encontrada", { status: 404 });

  try {
    const buffer = await downloadEssayImage(path);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No encontrada", { status: 404 });
  }
}
