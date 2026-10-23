import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiration,
  invitationStatus,
  isInvitationToken,
  isMemberId,
  isMemberInvitation,
  parseInviterMemberId,
  readRedemptionMemberIds,
  type InvitationStatus,
} from "@/lib/invitation-policy";
import {
  parseTasteFilmIds,
  TASTE_GATE_CREATOR,
  TASTE_GATE_DAILY_CAP,
  TASTE_GATE_MIN_FILMS,
  tasteGateDay,
} from "@/lib/taste-gate-policy";

type InvitationDocument = {
  createdAt: Timestamp;
  expiresAt: Timestamp;
  revokedAt: Timestamp | null;
  usedAt: Timestamp | null;
  usedByMemberId: string | null;
  createdByMemberId: string;
  source?: "admin" | "taste-gate";
  filmIds?: string[];
  clientKey?: string;
  kind?: "single" | "member";
  inviterMemberId?: string;
  redemptionMemberIds?: string[];
};

export type InvitationPerson = {
  id: string;
  name: string;
  email: string;
};

export type InvitationListItem = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  status: InvitationStatus;
  kind: "single" | "member";
  inviter: { id: string; name: string } | null;
  joined: InvitationPerson[];
};

export async function getInvitationStatusFromToken(token: string) {
  const invitation = await getInvitationTicketPayload(token);
  return invitation?.status ?? ("invalid" as const);
}

export async function getInvitationTicketPayload(token: string) {
  if (!isInvitationToken(token)) return null;

  const snapshot = await getAdminFirestore()
    .collection("invitations")
    .doc(hashInvitationToken(token))
    .get();
  if (!snapshot.exists) return null;
  const invitation = snapshot.data() as InvitationDocument;
  const expiresAt = invitation.expiresAt.toDate();

  const kind = isMemberInvitation(invitation.kind) ? "member" : "single";
  let inviterName: string | null = null;
  if (kind === "member" && isMemberId(invitation.inviterMemberId)) {
    const member = await getAdminFirestore().collection("members").doc(invitation.inviterMemberId).get();
    const name = member.data()?.name;
    inviterName = typeof name === "string" && name.trim() ? name.trim() : null;
  }

  return {
    expiresAt,
    kind,
    inviterName,
    status: invitationStatus({
      expiresAt,
      revokedAt: invitation.revokedAt?.toDate() ?? null,
      usedAt: kind === "member" ? null : invitation.usedAt?.toDate() ?? null,
    }),
  };
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

export async function createMemberInvitation(createdByMemberId: string, inviterMemberId: string) {
  const inviterId = parseInviterMemberId(inviterMemberId);
  const firestore = getAdminFirestore();
  const inviter = await firestore.collection("members").doc(inviterId).get();
  const name = inviter.data()?.name;
  if (!inviter.exists || inviter.data()?.active !== true || typeof name !== "string" || !name.trim()) {
    throw new Error("Elegí un miembro activo.");
  }

  const token = generateInvitationToken();
  const id = hashInvitationToken(token);
  const expiresAt = invitationExpiration();
  await firestore.collection("invitations").doc(id).create({
    createdByMemberId,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
    revokedAt: null,
    usedAt: null,
    usedByMemberId: null,
    kind: "member",
    inviterMemberId: inviterId,
    redemptionMemberIds: [],
    source: "admin",
  } satisfies InvitationDocument);

  return { id, token, expiresAt, inviterName: name.trim() };
}

export async function createTasteInvitation(filmIds: string[], clientKey: string, now = new Date()) {
  const requested = parseTasteFilmIds(filmIds);
  const firestore = getAdminFirestore();
  const snapshots = await firestore.getAll(
    ...requested.map((id) => firestore.collection("filmHistory").doc(id)),
  );
  const validIds = snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id);
  if (validIds.length < TASTE_GATE_MIN_FILMS) {
    throw new Error("Marcá pelis que estén en el archivo del club.");
  }

  const token = generateInvitationToken();
  const invitationId = hashInvitationToken(token);
  const expiresAt = invitationExpiration(now);
  const day = tasteGateDay(now);
  const limitRef = firestore.collection("tasteGateLimits").doc(clientKey);

  await firestore.runTransaction(async (transaction) => {
    const limitSnap = await transaction.get(limitRef);
    const previous = limitSnap.data() as { day?: string; count?: number } | undefined;
    const count = previous?.day === day ? previous.count ?? 0 : 0;
    if (count >= TASTE_GATE_DAILY_CAP) {
      throw new Error("Hoy ya te armamos un pase. Guardalo o volvé mañana.");
    }

    transaction.set(limitRef, {
      day,
      count: count + 1,
      updatedAt: Timestamp.fromDate(now),
    });
    transaction.create(firestore.collection("invitations").doc(invitationId), {
      createdByMemberId: TASTE_GATE_CREATOR,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      revokedAt: null,
      usedAt: null,
      usedByMemberId: null,
      source: "taste-gate",
      filmIds: validIds,
      clientKey,
    } satisfies InvitationDocument);
  });

  return { token, expiresAt, filmCount: validIds.length };
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
  const memberIds = [...new Set(rows.flatMap(({ invitation }) => relatedMemberIds(invitation)))];
  const memberSnapshots = memberIds.length
    ? await firestore.getAll(
        ...memberIds.map((id) => firestore.collection("members").doc(id)),
      )
    : [];
  const members = new Map(
    memberSnapshots
      .filter((member) => member.exists)
      .map((member) => [member.id, member.data() as { name: string; email: string }]),
  );

  return rows.map(({ id, invitation }) => {
    const kind = isMemberInvitation(invitation.kind) ? "member" as const : "single" as const;
    const inviterId = kind === "member" && isMemberId(invitation.inviterMemberId)
      ? invitation.inviterMemberId
      : null;
    const inviterRecord = inviterId ? members.get(inviterId) : undefined;
    return {
      id,
      createdAt: invitation.createdAt.toDate(),
      expiresAt: invitation.expiresAt.toDate(),
      status: invitationStatus({
        expiresAt: invitation.expiresAt.toDate(),
        revokedAt: invitation.revokedAt?.toDate() ?? null,
        usedAt: kind === "member" ? null : invitation.usedAt?.toDate() ?? null,
      }),
      kind,
      inviter: inviterId
        ? { id: inviterId, name: inviterRecord?.name?.trim() || "Sin nombre" }
        : null,
      joined: joinedMemberIds(invitation).map((memberId) => {
        const member = members.get(memberId);
        return member
          ? { id: memberId, name: member.name, email: member.email }
          : { id: memberId, name: "Miembro no encontrado", email: "" };
      }),
    };
  });
}

function joinedMemberIds(invitation: InvitationDocument) {
  if (isMemberInvitation(invitation.kind)) return readRedemptionMemberIds(invitation.redemptionMemberIds);
  return isMemberId(invitation.usedByMemberId) ? [invitation.usedByMemberId] : [];
}

function relatedMemberIds(invitation: InvitationDocument) {
  const ids = joinedMemberIds(invitation);
  if (isMemberInvitation(invitation.kind) && isMemberId(invitation.inviterMemberId)) {
    ids.push(invitation.inviterMemberId);
  }
  return ids;
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
