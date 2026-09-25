import { recommendationImageUrl, type RecommendationRound } from "@/lib/recommendation-policy";

export function RecommendationScreen({ round }: { round: RecommendationRound }) {
  const closed = round.status === "closed";
  return (
    <div className="recommendationScreen">
      <header className="recommendationHeader">
        <p className="kicker">Después de los créditos</p>
        <h1>Pochoclo <i>Recomienda</i><span className="recommendationAsterisk" aria-hidden="true">✳</span></h1>
        <div className="recommendationIntro">
          <p>Tres películas. La próxima puede estar acá.</p>
          <span>{closed ? "Selección cerrada" : "Elegí desde tu teléfono · una, dos o las tres"}</span>
        </div>
      </header>
      <div className="recommendationGrid">
        {round.movies.map((movie, index) => (
          <article className="recommendationCard" key={movie.id}>
            <div className="recommendationArt">
              <img alt={`Arte de ${movie.title}`} src={recommendationImageUrl(round.screeningId, movie, "landscape")} />
              <span className="recommendationNumber">0{index + 1}</span>
            </div>
            <p className="recommendationCredit">{movie.director}{movie.year ? ` · ${movie.year}` : ""}</p>
            <h2>{movie.title}</h2>
            <p className="recommendationReason">{movie.reason}</p>
            {closed ? (
              <p className="recommendationResult"><strong>{round.counts[movie.id] ?? 0}</strong> la quieren ver</p>
            ) : null}
          </article>
        ))}
      </div>
      <footer className="recommendationFooter">
        <span>Una selección de Pochoclo Club</span>
        <p aria-live="polite"><strong>{String(round.respondentCount).padStart(2, "0")}</strong> {round.respondentCount === 1 ? "persona eligió" : "personas eligieron"}</p>
        <span>{closed ? "Nos vemos en la próxima." : "Todavía podés cambiar de idea."}</span>
      </footer>
    </div>
  );
}
