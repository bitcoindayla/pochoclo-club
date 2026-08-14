"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import { clearLandingImage, saveLandingImage } from "@/lib/landing";
import { LandingImageError } from "@/lib/landing-images";

export type LandingActionState = {
  error: string | null;
  message: string | null;
};

function refreshLanding() {
  revalidatePath("/");
  revalidatePath("/club");
}

export async function updateLandingImageAction(
  _previous: LandingActionState,
  formData: FormData,
): Promise<LandingActionState> {
  const admin = await requireAdmin();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elegí una foto para la portada.", message: null };
  }

  try {
    await saveLandingImage(admin.id, file);
    refreshLanding();
    return { error: null, message: "Portada actualizada." };
  } catch (error) {
    return {
      error:
        error instanceof LandingImageError || error instanceof Error
          ? error.message
          : "No pudimos guardar esa foto.",
      message: null,
    };
  }
}

export async function clearLandingImageAction(
  previous: LandingActionState,
  formData: FormData,
): Promise<LandingActionState> {
  void previous;
  void formData;
  await requireAdmin();
  try {
    await clearLandingImage();
    refreshLanding();
    return { error: null, message: "Sacamos la foto de portada." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No pudimos quitar la foto.",
      message: null,
    };
  }
}
