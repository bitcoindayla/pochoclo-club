import { getCurrentMember } from "@/lib/authz";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { downloadMovieImage } from "@/lib/movie-images";
import type { MovieOptionInput } from "@/lib/movie-voting-policy";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    screeningId: string;
    optionId: string;
    variant: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const member = await getCurrentMember();
  if (!member) return new Response("No autorizado", { status: 401 });

  const { screeningId, optionId, variant } = await context.params;
  if (
    !/^[A-Za-z0-9_-]{1,100}$/.test(screeningId) ||
    !/^movie-[1-5]$/.test(optionId) ||
    !["landscape", "portrait"].includes(variant)
  ) {
    return new Response("Imagen inválida", { status: 400 });
  }

  const snapshot = await getAdminFirestore()
    .collection("movieBallots")
    .doc(screeningId)
    .get();
  if (!snapshot.exists) return new Response("No encontrada", { status: 404 });
  const options = (snapshot.data() as { options?: MovieOptionInput[] }).options ?? [];
  const movie = options.find((option) => option.id === optionId);
  const path = variant === "portrait"
    ? movie?.image?.portraitPath
    : movie?.image?.landscapePath;
  if (!path) return new Response("No encontrada", { status: 404 });

  try {
    const buffer = await downloadMovieImage(path);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No encontrada", { status: 404 });
  }
}
