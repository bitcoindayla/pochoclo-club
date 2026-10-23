"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import { parseInviterMemberId } from "@/lib/invitation-policy";
import {
  invitationSerial,
  invitationTicketPath,
} from "@/lib/invitation-ticket-policy";
import {
  createMemberInvitation,
  revokeInvitation,
} from "@/lib/invitations";

export type GeneratedInvitationLink = {
  id: string;
  url: string;
  expiresAt: string;
  serial: string;
  ticketPath: string;
  inviterName: string;
};

export type GenerateInvitationsState = {
  error: string | null;
  links: GeneratedInvitationLink[];
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
    const invitation = await createMemberInvitation(
      admin.id,
      parseInviterMemberId(formData.get("inviterMemberId")),
    );
    const baseUrl = applicationUrl();

    revalidatePath("/admin/invitaciones");
    revalidatePath("/admin/miembros");
    return {
      error: null,
      links: [{
        id: invitation.id,
        url: new URL(`/invite/${invitation.token}`, baseUrl).toString(),
        expiresAt: invitation.expiresAt.toISOString(),
        serial: invitationSerial(invitation.id),
        ticketPath: invitationTicketPath(invitation.token),
        inviterName: invitation.inviterName,
      }],
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
