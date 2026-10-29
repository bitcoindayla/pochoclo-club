"use client";

import { essayShareText, whatsappShareUrl } from "@/lib/essay-policy";

export function EssayShare({
  title,
  year,
  director,
  score,
  url,
  criticName,
}: {
  title: string;
  year: number;
  director: string;
  score: number;
  url: string;
  criticName?: string | null;
}) {
  const text = essayShareText({ title, year, director, score, url, criticName });

  function share() {
    window.open(whatsappShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <button className="essayShare" onClick={share} type="button">
      Compartir por WhatsApp
    </button>
  );
}
