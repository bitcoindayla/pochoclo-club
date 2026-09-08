import { formatImdbRating } from "@/lib/imdb-policy";

export function ImdbStar({
  rating,
  className = "",
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span className={`imdbStar ${className}`.trim()}>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 2.6 14.9 8.7 21.6 9.5 16.7 14.1 18.1 20.7 12 17.3 5.9 20.7 7.3 14.1 2.4 9.5 9.1 8.7Z" />
      </svg>
      <b>
        {formatImdbRating(rating)}
        <em>/10</em>
      </b>
    </span>
  );
}
