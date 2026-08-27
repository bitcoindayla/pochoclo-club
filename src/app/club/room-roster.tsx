import { ReputationMark } from "@/components/reputation-mark";
import type { Reputation } from "@/lib/reputation-policy";
import type { ScreeningOccupancy } from "@/lib/screenings";

export function RoomRoster({
  occupancy,
  reputations,
}: {
  occupancy: ScreeningOccupancy[];
  reputations: Record<string, Reputation>;
}) {
  if (occupancy.length === 0) return null;

  const people = [...occupancy].sort((left, right) =>
    left.memberName.localeCompare(right.memberName, "es"),
  );

  return (
    <section className="roomRoster">
      <p className="kicker">En la sala</p>
      <ul>
        {people.map((person) => {
          const registered =
            person.kind === "self" ||
            (typeof person.memberId === "string" && !person.memberId.startsWith("external-"));
          const reputation = registered ? reputations[person.memberId] : null;
          return (
            <li key={person.placeCode}>
              <div>
                <strong>{person.memberName}</strong>
                {person.kind === "guest" ? (
                  <small>+1 de {person.bookedByName}</small>
                ) : null}
              </div>
              {reputation ? <ReputationMark reputation={reputation} /> : <small className="mutedText">invitado</small>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
