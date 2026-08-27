import "server-only";

import { listFilmHistory, listScreeningOccupants } from "@/lib/critiques";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { listMembers } from "@/lib/members";
import {
  buildMemberReputation,
  isFoundingEmail,
  type Reputation,
} from "@/lib/reputation-policy";

export type { Reputation } from "@/lib/reputation-policy";

export async function listMemberReputations(): Promise<Map<string, Reputation>> {
  const firestore = getAdminFirestore();
  const [members, films, screenings] = await Promise.all([
    listMembers(),
    listFilmHistory(),
    firestore.collection("screenings").get(),
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
        filmCount: films.length,
        nights: closedNights,
        films,
      }),
    );
  }
  return reputations;
}
