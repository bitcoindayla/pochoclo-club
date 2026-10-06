"use client";

import { essayShareText, whatsappShareUrl } from "@/lib/essay-policy";

export function EssayShare({
  title,
  year,
  director,
  score,
  url,
}: {
  title: string;
  year: number;
  director: string;
  score: number;
  url: string;
}) {
  const text = essayShareText({ title, year, director, score, url });

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${title} (${year})`, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.open(whatsappShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <button className="essayShare" onClick={() => void share()} type="button">
      Compartir por WhatsApp
    </button>
  );
}
