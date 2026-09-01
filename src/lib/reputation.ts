import "server-only";

import { listFilmHistory, listScreeningOccupants } from "@/lib/critiques";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { listMembers } from "@/lib/members";
import {
  buildMemberReputation,
  guestReputationId,
  isFounderEmail,
  isFoundingEmail,
  type Reputation,
} from "@/lib/reputation-policy";

export type { Reputation } from "@/lib/reputation-policy";

export async function listMemberReputations(): Promise<Map<string, Reputation>> {
  const firestore = getAdminFirestore();
  const [members, films, screenings, guestArchives] = await Promise.all([
    listMembers(),
    listFilmHistory(),
    firestore.collection("screenings").get(),
    firestore.collection("guestArchives").limit(500).get(),
  ]);

  const nights = await Promise.all(
    screenings.docs.map(async (document) => {
      const status = (document.data() as { status?: unknown }).status;
      if (status !== "open" && status !== "closed") {
        return null;
      }
      try {
        const occupants = await listScreeningOccupants(document.id);
        return {
          closed: status === "closed",
          occupants: occupants.map((occupant) => ({
            personId: occupant.personId,
            memberId: occupant.memberId,
            hostMemberId: occupant.hostMemberId,
            kind: occupant.kind,
          })),
        };
      } catch {
        return null;
      }
    }),
  );

  const closedNights = nights.filter((night) => night !== null);
  const reputations = new Map<string, Reputation>();
  for (const member of members) {
    reputations.set(
      member.id,
      buildMemberReputation({
        memberId: member.id,
        founding: isFoundingEmail(member.email),
        founder: isFounderEmail(member.email),
        filmCount: films.length,
        nights: closedNights,
        films,
        archiveNights: member.archiveNights,
        archiveGuests: member.archiveGuests,
      }),
    );
  }
  for (const document of guestArchives.docs) {
    const data = document.data() as {
      name?: unknown;
      archiveNights?: unknown;
      archiveGuests?: unknown;
    };
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name) continue;
    const archiveNights = typeof data.archiveNights === "number" ? data.archiveNights : 0;
    const archiveGuests = typeof data.archiveGuests === "number" ? data.archiveGuests : 0;
    const id = guestReputationId(name);
    reputations.set(
      id,
      buildMemberReputation({
        memberId: id,
        founding: false,
        filmCount: films.length,
        nights: [],
        films: [],
        archiveNights,
        archiveGuests,
      }),
    );
  }
  return reputations;
}
