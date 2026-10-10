import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { calculateLandingStats, qualifiesForLandingStats } from "@/lib/landing-stats-policy";

// Frozen on 28 September 2026: 46 projected films, estimated at 10 visits each.
// Later nights use reservations, so older bookings never inflate the baseline.
export const LANDING_STATS_BASELINE = {
  screenings: 46,
  peoplePerScreening: 10,
  reservationsFrom: Date.parse("2026-09-28T17:00:15Z"),
};

export async function getLandingStats() {
  const now = Date.now();
  const snapshot = await getAdminFirestore().collection("screenings")
    .where("startsAt", ">=", Timestamp.fromMillis(LANDING_STATS_BASELINE.reservationsFrom))
    .where("startsAt", "<=", Timestamp.fromMillis(now))
    .select("startsAt", "status").get();
  const screenings = await Promise.all(snapshot.docs.flatMap(doc => {
    const data = doc.data();
    const screening = { id: doc.id, startsAt: data.startsAt.toMillis(), status: data.status };
    if (!qualifiesForLandingStats(screening, LANDING_STATS_BASELINE.reservationsFrom, now)) return [];
    return [(async () => {
      // One reservation per occupied place, including floor seats and +1s.
      // Cancellations delete their reservation; waitlists live separately.
      const count = await doc.ref.collection("reservations").count().get();
      return { ...screening, reservations: count.data().count };
    })()];
  }));
  return calculateLandingStats(LANDING_STATS_BASELINE, screenings, now);
}
