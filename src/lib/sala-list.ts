import "server-only";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  nextSalaListCount,
  parseSalaListCounts,
  parseSalaListVoterId,
  parseSalaListVotedIds,
  planSalaListToggle,
  SalaListError,
} from "@/lib/sala-list-policy";
import { SALA_LIST_COOKIE } from "@/lib/session";

const COUNTS_PATH = "system/salaListCounts";
const VOTERS = "salaListVoters";

export type SalaListState = {
  counts: Record<string, number>;
  votedIds: string[];
};

export type SalaListToggle = {
  filmId: string;
  voted: boolean;
  count: number;
};

export async function getSalaListState(): Promise<SalaListState> {
  const voterId = parseSalaListVoterId((await cookies()).get(SALA_LIST_COOKIE)?.value);
  const firestore = getAdminFirestore();
  const countsSnap = await firestore.doc(COUNTS_PATH).get();
  const voterSnap = voterId ? await firestore.collection(VOTERS).doc(voterId).get() : null;
  return {
    counts: parseSalaListCounts(countsSnap.data()?.counts),
    votedIds: parseSalaListVotedIds(voterSnap?.data()?.filmIds),
  };
}

export async function toggleSalaListVote(voterId: string, filmId: string): Promise<SalaListToggle> {
  if (!parseSalaListVoterId(voterId)) {
    throw new SalaListError("No pudimos anotar el voto.");
  }
  const firestore = getAdminFirestore();
  const countsRef = firestore.doc(COUNTS_PATH);
  const voterRef = firestore.collection(VOTERS).doc(voterId);

  return firestore.runTransaction(async (transaction) => {
    const [countsSnap, voterSnap] = await Promise.all([
      transaction.get(countsRef),
      transaction.get(voterRef),
    ]);
    const counts = parseSalaListCounts(countsSnap.data()?.counts);
    const plan = planSalaListToggle(filmId, voterSnap.data()?.filmIds);
    const count = nextSalaListCount(counts[plan.filmId] ?? 0, plan.voted);
    const now = FieldValue.serverTimestamp();
    transaction.set(
      countsRef,
      { counts: { ...counts, [plan.filmId]: count }, updatedAt: now },
      { merge: true },
    );
    transaction.set(voterRef, { filmIds: plan.nextIds, updatedAt: now }, { merge: true });
    return { filmId: plan.filmId, voted: plan.voted, count };
  });
}
