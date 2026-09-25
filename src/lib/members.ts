import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  hashInvitationToken,
  isInvitationToken,
} from "@/lib/invitation-policy";
import {
  canDeactivateMember,
  parseDisplayName,
  MemberAdminError,
} from "@/lib/member-admin-policy";

export type MemberRole = "member" | "admin";

export type Member = {
  id: string;
  email: string;
  name: string;
  imageUrl: string | null;
  role: MemberRole;
  active: boolean;
};

export type MemberAdminItem = Member & {
  pendingFirstLogin: boolean;
  createdAt: Date;
  lastSignedInAt: Date | null;
  archiveNights: number;
  archiveGuests: number;
};

export { MemberAdminError };

type MemberDocument = {
  authUid?: string | null;
  createdByMemberId?: string;
  email: string;
  name: string;
  imageUrl: string | null;
  role: MemberRole;
  active: boolean;
  archiveNights?: number;
  archiveGuests?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSignedInAt: Timestamp | null;
};

export type FirebaseIdentity = {
  uid: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
};

export type MembershipErrorCode =
  | "account-conflict"
  | "inactive-member"
  | "invitation-required"
  | "invalid-invitation"
  | "used-invitation"
  | "revoked-invitation"
  | "expired-invitation";

export class MembershipError extends Error {
  constructor(public readonly code: MembershipErrorCode) {
    super(code);
    this.name = "MembershipError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

function toMember(id: string, document: MemberDocument): Member {
  return {
    id,
    email: document.email,
    name: document.name,
    imageUrl: document.imageUrl,
    role: document.role,
    active: document.active,
  };
}

function displayName(identity: FirebaseIdentity) {
  return identity.name?.trim() || identity.email.split("@")[0];
}

export function memberEmailLockId(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

export async function authorizeFirebaseIdentity(
  identity: FirebaseIdentity,
  invitationToken?: string,
): Promise<Member | null> {
  const firestore = getAdminFirestore();
  const email = normalizeEmail(identity.email);
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL
    ? normalizeEmail(process.env.INITIAL_ADMIN_EMAIL)
    : null;

  const memberReference = firestore.collection("members").doc(identity.uid);
  const emailReference = firestore.collection("memberEmails").doc(memberEmailLockId(email));
  const identityReference = firestore.collection("memberIdentities").doc(identity.uid);

  return firestore.runTransaction(async (transaction) => {
    const [memberSnapshot, emailSnapshot, identitySnapshot] = await Promise.all([
      transaction.get(memberReference),
      transaction.get(emailReference),
      transaction.get(identityReference),
    ]);

    if (memberSnapshot.exists) {
      const member = memberSnapshot.data() as MemberDocument;
      if (!member.active) throw new MembershipError("inactive-member");
      if (normalizeEmail(member.email) !== email) {
        throw new MembershipError("account-conflict");
      }

      transaction.update(memberReference, {
        imageUrl: identity.imageUrl,
        updatedAt: FieldValue.serverTimestamp(),
        lastSignedInAt: FieldValue.serverTimestamp(),
      });
      return toMember(identity.uid, {
        ...member,
        imageUrl: identity.imageUrl,
      });
    }

    if (emailSnapshot.exists) {
      const memberId = emailSnapshot.data()?.memberId;
      if (typeof memberId !== "string" || !memberId || memberId.includes("/")) {
        throw new MembershipError("account-conflict");
      }
      const linkedReference = firestore.collection("members").doc(memberId);
      const linkedSnapshot = await transaction.get(linkedReference);
      const linked = linkedSnapshot.exists ? linkedSnapshot.data() as MemberDocument : null;
      if (!linked || !linked.createdByMemberId || normalizeEmail(linked.email) !== email ||
        (linked.authUid !== null && linked.authUid !== identity.uid) ||
        (identitySnapshot.exists && identitySnapshot.data()?.memberId !== memberId)) {
        throw new MembershipError("account-conflict");
      }
      if (!linked.active) throw new MembershipError("inactive-member");
      transaction.update(linkedReference, {
        authUid: identity.uid, imageUrl: identity.imageUrl,
        updatedAt: FieldValue.serverTimestamp(), lastSignedInAt: FieldValue.serverTimestamp(),
      });
      transaction.set(identityReference, { memberId, linkedAt: identitySnapshot.data()?.linkedAt ?? Timestamp.now() });
      return toMember(memberId, { ...linked, imageUrl: identity.imageUrl });
    }
    if (identitySnapshot.exists) throw new MembershipError("account-conflict");

    const isInitialAdmin = initialAdminEmail === email;
    let invitationReference: FirebaseFirestore.DocumentReference | null = null;

    if (!isInitialAdmin) {
      if (!invitationToken) throw new MembershipError("invitation-required");
      if (!isInvitationToken(invitationToken)) {
        throw new MembershipError("invalid-invitation");
      }

      invitationReference = firestore
        .collection("invitations")
        .doc(hashInvitationToken(invitationToken));
      const invitationSnapshot = await transaction.get(invitationReference);
      if (!invitationSnapshot.exists) {
        throw new MembershipError("invalid-invitation");
      }

      const invitation = invitationSnapshot.data() as {
        expiresAt: Timestamp;
        revokedAt: Timestamp | null;
        usedAt: Timestamp | null;
      };
      if (invitation.usedAt) throw new MembershipError("used-invitation");
      if (invitation.revokedAt) throw new MembershipError("revoked-invitation");
      if (invitation.expiresAt.toMillis() <= Date.now()) {
        throw new MembershipError("expired-invitation");
      }
    }

    const now = Timestamp.now();
    const member: MemberDocument = {
      email,
      name: displayName(identity),
      imageUrl: identity.imageUrl,
      role: isInitialAdmin ? "admin" : "member",
      active: true,
      createdAt: now,
      updatedAt: now,
      lastSignedInAt: now,
    };

    transaction.create(memberReference, member);
    transaction.create(emailReference, { memberId: identity.uid, createdAt: now });
    if (invitationReference) {
      transaction.update(invitationReference, {
        usedAt: now,
        usedByMemberId: identity.uid,
      });
    }

    return toMember(identity.uid, member);
  });
}

export async function getMemberById(id: string) {
  const snapshot = await getAdminFirestore().collection("members").doc(id).get();
  return snapshot.exists ? toMember(snapshot.id, snapshot.data() as MemberDocument) : null;
}

export async function getMemberByFirebaseUid(uid: string) {
  const existing = await getMemberById(uid);
  if (existing) return existing;
  const firestore = getAdminFirestore();
  const identity = await firestore.collection("memberIdentities").doc(uid).get();
  const memberId = identity.data()?.memberId;
  if (typeof memberId !== "string" || !memberId || memberId.includes("/")) return null;
  const snapshot = await firestore.collection("members").doc(memberId).get();
  if (!snapshot.exists || snapshot.data()?.authUid !== uid) return null;
  return toMember(memberId, snapshot.data() as MemberDocument);
}

function toAdminItem(id: string, document: MemberDocument): MemberAdminItem {
  return {
    ...toMember(id, document),
    pendingFirstLogin: document.authUid === null && Boolean(document.createdByMemberId),
    createdAt: document.createdAt?.toDate() ?? new Date(0),
    lastSignedInAt: document.lastSignedInAt?.toDate() ?? null,
    archiveNights: typeof document.archiveNights === "number" ? document.archiveNights : 0,
    archiveGuests: typeof document.archiveGuests === "number" ? document.archiveGuests : 0,
  };
}

export async function listMembers(): Promise<MemberAdminItem[]> {
  const snapshot = await getAdminFirestore().collection("members").limit(500).get();
  return snapshot.docs
    .map((document) => toAdminItem(document.id, document.data() as MemberDocument))
    .sort((left, right) => {
      if (left.active !== right.active) return left.active ? -1 : 1;
      return left.name.localeCompare(right.name, "es");
    });
}

export async function updateMemberName(id: string, name: unknown) {
  if (!id || id.includes("/")) throw new MemberAdminError("Esa persona no es válida.");
  const parsed = parseDisplayName(name);
  const reference = getAdminFirestore().collection("members").doc(id);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new MemberAdminError("No encontramos a esa persona.");
  await reference.update({
    name: parsed,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setMemberActive(id: string, active: boolean) {
  if (!id || id.includes("/")) throw new MemberAdminError("Esa persona no es válida.");
  const firestore = getAdminFirestore();
  const reference = firestore.collection("members").doc(id);

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new MemberAdminError("No encontramos a esa persona.");
    const member = snapshot.data() as MemberDocument;
    if (member.active === active) return;

    if (!active && member.role === "admin") {
      const admins = await transaction.get(
        firestore.collection("members").where("role", "==", "admin"),
      );
      const decision = canDeactivateMember(
        admins.docs.map((document) => {
          const data = document.data() as MemberDocument;
          return { id: document.id, role: data.role, active: data.active };
        }),
        id,
      );
      if (!decision.ok) throw new MemberAdminError(decision.reason);
    }

    transaction.update(reference, {
      active,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export type MemberSearchItem = {
  id: string;
  name: string;
};

export async function listActiveMembersForReservation(): Promise<MemberSearchItem[]> {
  const snapshot = await getAdminFirestore().collection("members").limit(500).get();
  return snapshot.docs
    .map((document) => ({ id: document.id, member: document.data() as MemberDocument }))
    .filter(({ member }) => member.active && Boolean(member.name.trim()))
    .map(({ id, member }) => ({ id, name: member.name }))
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}
