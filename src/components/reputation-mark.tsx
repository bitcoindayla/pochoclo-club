import {
  REPUTATION_TONE_LABEL,
  reputationSummary,
  type Reputation,
} from "@/lib/reputation-policy";

export function ReputationMark({
  reputation,
  compact = false,
}: {
  reputation: Reputation;
  compact?: boolean;
}) {
  return (
    <span
      className={`repMark tone-${reputation.tone}${compact ? " isCompact" : ""}`}
      title={reputationSummary(reputation)}
    >
      <b className="repScore" aria-label={`${reputation.stars} de 10`}>
        {reputation.stars}
      </b>
      <span className="repStars" aria-hidden="true">
        <i style={{ width: `${reputation.stars * 10}%` }} />
      </span>
      {compact ? (
        <small>
          {reputation.nights}f
          {reputation.guests > 0 ? ` · ${reputation.guests}+1` : ""}
        </small>
      ) : (
        <small>{REPUTATION_TONE_LABEL[reputation.tone]}</small>
      )}
    </span>
  );
}
