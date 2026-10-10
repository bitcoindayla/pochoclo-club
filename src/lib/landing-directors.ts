import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { groupDirectors, isLandingBallotLive } from "@/lib/director-mosaic";

export async function hasLiveLandingBallot() {
  const db = getAdminFirestore();
  const pointer = await db.doc("system/openMovieBallot").get();
  const id = pointer.data()?.screeningId;
  if (typeof id !== "string" || !id || id.includes("/")) return false;
  const snapshot = await db.collection("movieBallots").doc(id).get();
  const ballot = snapshot.data();
  return isLandingBallotLive(ballot ? { status: ballot.status, closesAt: ballot.closesAt.toMillis() } : null);
}

export async function getLandingDirectors() {
  // Only film credits and room scores go to the public landing page.
  const snapshot = await getAdminFirestore().collection("filmHistory")
    .orderBy("watchedAt", "desc").select("director", "title", "year", "score", "essay").get();
  return groupDirectors(snapshot.docs.map(doc => {
    const film = doc.data();
    return {
      id: doc.id,
      director: film.director,
      title: film.title,
      year: film.year,
      score: film.score,
      hasEssay: typeof film.essay === "string" && film.essay.trim().length > 0,
    };
  }));
}
