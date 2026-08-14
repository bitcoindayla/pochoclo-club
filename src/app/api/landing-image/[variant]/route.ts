import { getAdminFirestore } from "@/lib/firebase/admin";
import { downloadLandingImage } from "@/lib/landing-images";
import type { LandingImageRecord } from "@/lib/landing-images";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ variant: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { variant } = await context.params;
  if (variant !== "landscape" && variant !== "portrait") {
    return new Response("Imagen inválida", { status: 400 });
  }

  const snapshot = await getAdminFirestore().doc("system/landing").get();
  if (!snapshot.exists) return new Response("No encontrada", { status: 404 });
  const data = snapshot.data() as Partial<LandingImageRecord>;
  const path = variant === "portrait" ? data.portraitPath : data.landscapePath;
  if (!path) return new Response("No encontrada", { status: 404 });

  try {
    const buffer = await downloadLandingImage(path);
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
