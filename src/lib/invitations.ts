import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiration,
  invitationStatus,
  isInvitationToken,
  type InvitationStatus,
} from "@/lib/invitation-policy";

type InvitationDocument = {
  createdAt: Timestamp;
  expiresAt: Timestamp;
  revokedAt: Timestamp | null;
  usedAt: Timestamp | null;
  usedByMemberId: string | null;
  createdByMemberId: string;
};

export type InvitationListItem = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  status: InvitationStatus;
  usedBy: { name: string; email: string } | null;
};

export async function getInvitationStatusFromToken(token: string) {
  if (!isInvitationToken(token)) return "invalid" as const;

  const snapshot = await getAdminFirestore()
    .collection("invitations")
    .doc(hashInvitationToken(token))
    .get();
  if (!snapshot.exists) return "invalid" as const;
  const invitation = snapshot.data() as InvitationDocument;

  return invitationStatus({
    expiresAt: invitation.expiresAt.toDate(),
    revokedAt: invitation.revokedAt?.toDate() ?? null,
    usedAt: invitation.usedAt?.toDate() ?? null,
  });
}

export async function createInvitationBatch(createdByMemberId: string, count: number) {
  const firestore = getAdminFirestore();
  const expiresAt = invitationExpiration();
  const invitations = Array.from({ length: count }, () => {
    const token = generateInvitationToken();
    return {
      id: hashInvitationToken(token),
      token,
    };
  });

  const batch = firestore.batch();
  const now = Timestamp.now();
  for (const invitation of invitations) {
    batch.create(firestore.collection("invitations").doc(invitation.id), {
      createdByMemberId,
      createdAt: now,
      expiresAt: Timestamp.fromDate(expiresAt),
      revokedAt: null,
      usedAt: null,
      usedByMemberId: null,
    } satisfies InvitationDocument);
  }
  await batch.commit();

  return invitations.map(({ id, token }) => ({ id, token, expiresAt }));
}

export async function listInvitations(): Promise<InvitationListItem[]> {
  const firestore = getAdminFirestore();
  const snapshot = await firestore
    .collection("invitations")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const rows = snapshot.docs.map((document) => ({
    id: document.id,
    invitation: document.data() as InvitationDocument,
  }));
  const usedMemberIds = [...new Set(
    rows.map(({ invitation }) => invitation.usedByMemberId).filter(Boolean) as string[],
  )];
  const memberSnapshots = usedMemberIds.length
    ? await firestore.getAll(
        ...usedMemberIds.map((id) => firestore.collection("members").doc(id)),
      )
    : [];
  const usedMembers = new Map(
    memberSnapshots
      .filter((member) => member.exists)
      .map((member) => [member.id, member.data() as { name: string; email: string }]),
  );

  return rows.map(({ id, invitation }) => ({
    id,
    createdAt: invitation.createdAt.toDate(),
    expiresAt: invitation.expiresAt.toDate(),
    status: invitationStatus({
      expiresAt: invitation.expiresAt.toDate(),
      revokedAt: invitation.revokedAt?.toDate() ?? null,
      usedAt: invitation.usedAt?.toDate() ?? null,
    }),
    usedBy: invitation.usedByMemberId
      ? usedMembers.get(invitation.usedByMemberId) ?? null
      : null,
  }));
}

export async function revokeInvitation(id: string) {
  const firestore = getAdminFirestore();
  const reference = firestore.collection("invitations").doc(id);
  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) return false;
    const invitation = snapshot.data() as InvitationDocument;
    if (invitation.usedAt || invitation.revokedAt) return false;
    transaction.update(reference, { revokedAt: Timestamp.now() });
    return true;
  });
}
