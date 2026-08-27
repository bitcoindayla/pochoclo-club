import { ReputationMark } from "@/components/reputation-mark";
import {
  REPUTATION_TONE_LABEL,
  type Reputation,
} from "@/lib/reputation-policy";
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
      <div className="roomRosterHead">
        <div>
          <p className="kicker">En la sala</p>
          <h3>Quién viene</h3>
        </div>
        <span>{occupancy.length} ocupados</span>
      </div>
      <ol>
        {people.map((person, index) => {
          const registered =
            person.kind === "self" ||
            (typeof person.memberId === "string" && !person.memberId.startsWith("external-"));
          const reputation = registered ? reputations[person.memberId] ?? null : null;
          return (
            <li
              className={`roomRosterRow tone-${reputation?.tone ?? "seed"}`}
              key={person.placeCode}
            >
              <span className="repIndex">{String(index + 1).padStart(2, "0")}</span>
              <div className="roomRosterWho">
                <strong>{person.memberName}</strong>
                <small>
                  {person.placeCode}
                  {person.kind === "guest" ? ` · +1 de ${person.bookedByName}` : ""}
                  {reputation ? ` · ${REPUTATION_TONE_LABEL[reputation.tone]}` : " · Invitado"}
                </small>
                {reputation ? (
                  <dl className="repFacts">
                    <div>
                      <dt>Funciones</dt>
                      <dd>{reputation.nights}</dd>
                    </div>
                    <div>
                      <dt>Invitados</dt>
                      <dd>{reputation.guests}</dd>
                    </div>
                    <div>
                      <dt>Promedio</dt>
                      <dd>{reputation.average == null ? "—" : reputation.average.toFixed(1)}</dd>
                    </div>
                  </dl>
                ) : null}
              </div>
              {reputation ? (
                <ReputationMark reputation={reputation} />
              ) : (
                <span className="repMark tone-seed">
                  <b className="repScore">—</b>
                  <small>Invitado</small>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
