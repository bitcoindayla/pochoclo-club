"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import { parseInvitationCount } from "@/lib/invitation-policy";
import {
  createInvitationBatch,
  revokeInvitation,
} from "@/lib/invitations";

export type GenerateInvitationsState = {
  error: string | null;
  links: Array<{ id: string; url: string; expiresAt: string }>;
};

function applicationUrl() {
  const configuredUrl =
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  if (!configuredUrl) throw new Error("Falta configurar APP_URL.");
  return new URL(configuredUrl);
}

export async function generateInvitationsAction(
  _previousState: GenerateInvitationsState,
  formData: FormData,
): Promise<GenerateInvitationsState> {
  const admin = await requireAdmin();

  try {
    const count = parseInvitationCount(formData.get("count"));
    const invitations = await createInvitationBatch(admin.id, count);
    const baseUrl = applicationUrl();

    revalidatePath("/admin/invitaciones");
    revalidatePath("/admin/miembros");
    return {
      error: null,
      links: invitations.map((invitation) => ({
        id: invitation.id,
        url: new URL(`/invite/${invitation.token}`, baseUrl).toString(),
        expiresAt: invitation.expiresAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudieron generar las invitaciones.",
      links: [],
    };
  }
}

export async function revokeInvitationAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f]{64}$/i.test(id)) return;

  await revokeInvitation(id);
  revalidatePath("/admin/invitaciones");
  revalidatePath("/admin/miembros");
}
