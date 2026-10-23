import { hashInvitationToken, isInvitationToken } from "@/lib/invitation-policy";
import {
  invitationTicketImage,
  loadInvitationTicketAssets,
} from "@/lib/invitation-ticket-image";
import {
  formatInvitationExpiry,
  invitationSerial,
} from "@/lib/invitation-ticket-policy";
import { getInvitationTicketPayload } from "@/lib/invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!isInvitationToken(token)) {
    return new Response("No encontrada", { status: 404 });
  }

  const payload = await getInvitationTicketPayload(token);
  if (!payload) return new Response("No encontrada", { status: 404 });

  const inviteUrl = new URL(`/invite/${encodeURIComponent(token)}`, requestOrigin(request)).toString();
  const { bear, qr } = await loadInvitationTicketAssets(inviteUrl);

  return invitationTicketImage({
    serial: invitationSerial(hashInvitationToken(token)),
    expiresLabel: formatInvitationExpiry(payload.expiresAt),
    status: payload.status,
    bear,
    qr,
    shared: payload.kind === "member",
    inviterName: payload.inviterName,
  });
}

function requestOrigin(request: Request) {
  const configured =
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null);
  if (configured) return configured;
  return new URL(request.url).origin;
}
