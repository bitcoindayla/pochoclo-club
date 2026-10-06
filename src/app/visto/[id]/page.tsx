import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EssayShare } from "@/components/essay-share";
import { essayExcerpt, formatClubScore } from "@/lib/essay-policy";
import { getPublicFilmEssay } from "@/lib/film-essays";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const film = await getPublicFilmEssay(id);
  if (!film) return { title: "Reseña" };
  const score = formatClubScore(film.score);
  return {
    title: `${film.title} · ${score}`,
    description: essayExcerpt(film.essay),
    openGraph: {
      title: `${film.title} (${film.year}) · ${score}`,
      description: essayExcerpt(film.essay),
      type: "article",
      locale: "es_AR",
      siteName: "Pochoclo Club",
      images: film.imageUrl
        ? [{ url: film.imageUrl, width: 1920, height: 1080, alt: `Fotograma de ${film.title}` }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${film.title} · ${score}`,
      description: essayExcerpt(film.essay),
      images: film.imageUrl ? [film.imageUrl] : undefined,
    },
  };
}

export default async function FilmEssayPage({ params }: PageProps) {
  const { id } = await params;
  const film = await getPublicFilmEssay(id);
  if (!film) notFound();
  const score = formatClubScore(film.score);

  return (
    <article className="essayPage">
      <header className="essayStill">
        {film.imageUrl ? (
          <picture>
            {film.portraitUrl ? (
              <source media="(max-width: 699px)" srcSet={film.portraitUrl} />
            ) : null}
            <img alt={`Fotograma de ${film.title}`} src={film.imageUrl} />
          </picture>
        ) : (
          <div className="essayStillFallback" />
        )}
        <p className="essayScore">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 2.6 14.9 8.7 21.6 9.5 16.7 14.1 18.1 20.7 12 17.3 5.9 20.7 7.3 14.1 2.4 9.5 9.1 8.7Z" />
          </svg>
          <b>{score}</b>
        </p>
      </header>
      <div className="essayBody">
        <p className="kicker">Pochoclo Club</p>
        <h1>
          {film.title}
          <small>
            {film.year} · {film.director}
          </small>
        </h1>
        <div className="essayText">
          {film.essay.split(/\n{2,}/).map((paragraph, index) => (
            <p key={`${index}:${paragraph.length}`}>{paragraph}</p>
          ))}
        </div>
        <EssayShare
          director={film.director}
          score={film.score}
          title={film.title}
          url={`https://pochoclo.club/visto/${film.id}`}
          year={film.year}
        />
      </div>
    </article>
  );
}
