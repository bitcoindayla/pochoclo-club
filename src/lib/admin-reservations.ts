import "server-only";

import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";

import { AdminReservationError, type AdminReservationInput } from "@/lib/admin-reservation-policy";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { memberEmailLockId } from "@/lib/members";
import { memberCanAccessSeats, type MovieBallotStatus } from "@/lib/movie-voting-policy";

export type AdminReservationResult = {
  personId: string;
  name: string;
  placeCode: string;
  createdMember: boolean;
  exemptionGranted: boolean;
};

// Every write, including a new member and a voting exemption, commits with the seat.
export async function reserveSeatAsAdmin(adminId: string, input: AdminReservationInput): Promise<AdminReservationResult> {
  const db = getAdminFirestore();
  const screening = db.collection("screenings").doc(input.screeningId);
  const ballot = db.collection("movieBallots").doc(input.screeningId);
  const requestReference = screening.collection("adminReservationRequests").doc(input.requestId);
  const fingerprint = createHash("sha256").update(JSON.stringify({ adminId, ...input })).digest("hex");
  const emailReference = input.person.mode === "account"
    ? db.collection("memberEmails").doc(memberEmailLockId(input.person.email)) : null;

  return db.runTransaction(async (transaction) => {
    const [admin, night, pointer, place, block, request, emailLock] = await Promise.all([
      transaction.get(db.collection("members").doc(adminId)),
      transaction.get(screening),
      transaction.get(db.collection("system").doc("openScreening")),
      transaction.get(screening.collection("places").doc(input.placeCode)),
      transaction.get(screening.collection("blocks").doc(input.placeCode)),
      transaction.get(requestReference),
      emailReference ? transaction.get(emailReference) : null,
    ]);
    if (admin.data()?.role !== "admin" || admin.data()?.active !== true) {
      throw new AdminReservationError("Solo un administrador activo puede asignar lugares.");
    }
    if (request.exists) {
      if (request.data()?.fingerprint !== fingerprint) {
        throw new AdminReservationError("Esta operación ya se utilizó. Empezá una reserva nueva.");
      }
      return request.data()!.result as AdminReservationResult;
    }
    if (!night.exists || night.data()?.status !== "open" || pointer.data()?.screeningId !== input.screeningId) {
      throw new AdminReservationError("Las reservas de esta función no están abiertas.");
    }
    if (place.exists) throw new AdminReservationError("Ese lugar acaba de ser ocupado. Elegí otro.");
    if (block.exists) throw new AdminReservationError("Primero desbloqueá ese lugar para poder reservarlo.");

    const personId = input.person.mode === "member" ? input.person.memberId
      : input.person.mode === "account" ? emailLock?.data()?.memberId ?? `member-${input.requestId}`
        : `external-admin-${input.requestId}`;
    if (typeof personId !== "string" || !personId || personId.includes("/") || personId.length > 100) {
      throw new AdminReservationError("No pudimos verificar a esa persona.");
    }
    const memberReference = input.person.mode !== "name" ? db.collection("members").doc(personId) : null;
    const reservationReference = screening.collection("reservations").doc(personId);
    const exemptionReference = ballot.collection("exemptions").doc(personId);
    const [member, reservation, waitlist, voting, vote, exemption] = await Promise.all([
      memberReference ? transaction.get(memberReference) : null,
      transaction.get(reservationReference),
      transaction.get(screening.collection("waitlist").doc(personId)),
      transaction.get(ballot),
      transaction.get(ballot.collection("votes").doc(personId)),
      transaction.get(exemptionReference),
    ]);
    const createdMember = input.person.mode === "account" && !emailLock?.exists;
    if (memberReference && !createdMember && (!member?.exists || member.data()?.active !== true)) {
      throw new AdminReservationError("Ese miembro no está activo. Revisá su ficha antes de reservar.");
    }
    if (createdMember && member?.exists) throw new AdminReservationError("Empezá una reserva nueva para esta persona.");
    if (input.person.mode === "account" && member?.exists && member.data()?.email !== input.person.email) {
      throw new AdminReservationError("No pudimos verificar el mail de esa cuenta.");
    }
    if (reservation.exists) {
      throw new AdminReservationError(`Esa persona ya tiene el lugar ${reservation.data()?.placeCode}. Podés moverla desde la tabla.`);
    }
    if (waitlist.exists) {
      throw new AdminReservationError("Esa persona ya está en la lista de espera. Quitala de la espera antes de asignarle un lugar manualmente.");
    }
    const status = voting.data()?.status as MovieBallotStatus | undefined;
    if (voting.exists && !["draft", "open", "decision", "closed", "canceled"].includes(status ?? "")) {
      throw new AdminReservationError("No pudimos verificar la votación de esta función.");
    }
    const exemptionGranted = Boolean(memberReference && voting.exists && !memberCanAccessSeats({
      ballotStatus: status!, hasVote: vote.exists, hasExemption: exemption.exists,
    }));
    const name = member?.exists ? member.data()!.name as string
      : input.person.mode !== "member" ? input.person.name : "";
    if (!name.trim()) throw new AdminReservationError("Completá el nombre de la persona.");
    const now = Timestamp.now();
    if (createdMember && memberReference && emailReference && input.person.mode === "account") {
      transaction.create(memberReference, {
        email: input.person.email, name, role: "member", active: true, imageUrl: null,
        authUid: null, createdByMemberId: adminId, createdAt: now, updatedAt: now, lastSignedInAt: null,
      });
      transaction.create(emailReference, { memberId: personId, createdAt: now });
    }
    if (exemptionGranted) {
      transaction.create(exemptionReference, {
        memberId: personId, grantedByMemberId: adminId, reason: "admin-reservation", createdAt: now,
      });
    }
    const booking = {
      memberId: personId, kind: "self", bookedByMemberId: adminId,
      ...(input.person.mode === "name" ? { displayName: name } : {}),
      createdAt: now,
    };
    transaction.create(reservationReference, { ...booking, placeCode: input.placeCode, source: "admin", updatedAt: now });
    transaction.create(screening.collection("places").doc(input.placeCode), { ...booking, reservationId: personId });
    const result = { personId, name, placeCode: input.placeCode, createdMember, exemptionGranted };
    transaction.create(requestReference, { fingerprint, adminId, result, createdAt: now });
    return result;
  });
}
