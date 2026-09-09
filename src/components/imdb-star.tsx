import { formatImdbRating } from "@/lib/imdb-policy";

function ImdbLogo() {
  return (
    <svg aria-hidden="true" className="imdbLogo" viewBox="0 0 64 32">
      <rect width="64" height="32" rx="4" fill="#f5c518" />
      <rect x="2.2" y="2.2" width="59.6" height="27.6" rx="2.4" fill="none" stroke="#c8960a" strokeWidth="1.1" />
      <text
        x="32"
        y="22.4"
        textAnchor="middle"
        fill="#111"
        fontFamily="Helvetica Neue, Arial Black, Arial, sans-serif"
        fontSize="16.5"
        fontWeight="900"
        letterSpacing="-0.35"
      >
        IMDb
      </text>
    </svg>
  );
}

export function ImdbStar({
  rating,
  className = "",
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span className={`imdbStar ${className}`.trim()} title={`IMDb ${formatImdbRating(rating)} / 10`}>
      <ImdbLogo />
      <svg aria-hidden="true" className="imdbStarMark" viewBox="0 0 24 24">
        <path d="M12 2.6 14.9 8.7 21.6 9.5 16.7 14.1 18.1 20.7 12 17.3 5.9 20.7 7.3 14.1 2.4 9.5 9.1 8.7Z" />
      </svg>
      <b>
        {formatImdbRating(rating)}
        <em>/10</em>
      </b>
    </span>
  );
}
