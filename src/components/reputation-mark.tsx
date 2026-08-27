import {
  reputationSummary,
  type Reputation,
} from "@/lib/reputation-policy";

export function ReputationMark({ reputation }: { reputation: Reputation }) {
  return (
    <span
      className={`repMark tone-${reputation.tone}`}
      title={reputationSummary(reputation)}
    >
      <span className="repStars" aria-label={`${reputation.stars} de 10`}>
        <i style={{ width: `${reputation.stars * 10}%` }} />
      </span>
      <small>
        {reputation.nights}
        {reputation.guests > 0 ? ` · ${reputation.guests}+1` : ""}
        {reputation.average != null ? ` · ${reputation.average.toFixed(1)}` : ""}
      </small>
    </span>
  );
}
