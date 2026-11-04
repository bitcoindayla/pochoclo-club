import type { ReactNode } from "react";

const GLYPHS: Record<string, ReactNode> = {
  "spirited-away": (
    <>
      <circle cx="16" cy="14.5" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M11.2 14.5h9.6M16 9.4v5.1" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M9 22.5c2-2.2 4.6-3.3 7-3.3s5 1.1 7 3.3" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </>
  ),
  parasite: (
    <>
      <path d="M9 22.5h14M11 22.5V17h5V12h5V8.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="21" cy="8.5" r="1.4" fill="currentColor" />
    </>
  ),
  whiplash: (
    <>
      <ellipse cx="16" cy="17.2" rx="6.2" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M10.5 9.5l4.2 6.4M21.5 9.2l-4.1 6.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  "lives-of-others": (
    <>
      <path d="M9.5 14.5c2.2-3.2 4.4-4.8 6.5-4.8s4.3 1.6 6.5 4.8c-2.2 3.2-4.4 4.8-6.5 4.8s-4.3-1.6-6.5-4.8z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="16" cy="14.5" r="1.6" fill="currentColor" />
      <path d="M11 21.8h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  "princess-mononoke": (
    <>
      <circle cx="16" cy="14" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="14.2" cy="13.2" r="0.7" fill="currentColor" />
      <circle cx="17.8" cy="13.2" r="0.7" fill="currentColor" />
      <path d="M16 9.6v-2.2M13.2 10.2l-1.6-1.8M18.8 10.2l1.6-1.8M12.2 22.2l3.8-4.4 3.8 4.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
  oldboy: (
    <>
      <path d="M11 11.5h10v3.2H11zM15.2 14.7v8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M13.4 22.7h7.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  "eternal-sunshine": (
    <>
      <path d="M12.2 13.2c0-2 1.5-3.4 3.3-3.4 1.1 0 2 .5 2.5 1.3.5-.8 1.4-1.3 2.5-1.3 1.8 0 3.3 1.4 3.3 3.4 0 3.6-5.8 6.8-5.8 6.8S12.2 16.8 12.2 13.2z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M11 20.5l10-9" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </>
  ),
  incendies: (
    <>
      <path d="M16 9.2c1.8 3.2-1.2 4.6-.2 7.4 2.4-1.2 4.8-3.6 4.8-6.6 2.6 3.2 1.8 9.2-4.6 11.2-6.4-2-7.4-8.2-4.4-11.4 1.4 2.4 2.6 2.6 4.4-.6z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
  "a-separation": (
    <>
      <circle cx="11.8" cy="12.2" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="20.2" cy="12.2" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.2 22.2c.4-3.4 1.8-5 2.6-5s2.2 1.6 2.6 5M17.6 22.2c.4-3.4 1.8-5 2.6-5s2.2 1.6 2.6 5M16 9.5v13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  "the-hunt": (
    <>
      <path d="M10.2 18.5c0-4.2 2.4-8.2 5.8-8.2s5.8 4 5.8 8.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M12.4 11.2c-1.8-2.4-3.6-2.8-4.4-2.2M19.6 11.2c1.8-2.4 3.6-2.8 4.4-2.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="16" cy="16.4" r="1.2" fill="currentColor" />
    </>
  ),
  amelie: (
    <>
      <path d="M11 20.5c2.2-6.5 4-9.8 5-11.6 1 1.8 2.8 5.1 5 11.6" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M13.2 17.2h5.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="16" cy="12.2" r="1.15" fill="currentColor" />
    </>
  ),
  "pans-labyrinth": (
    <>
      <path d="M16 8.8c3.6 0 6.6 2.2 6.6 5.6 0 4.6-6.6 8.8-6.6 8.8S9.4 19 9.4 14.4c0-3.4 3-5.6 6.6-5.6z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="16" cy="14.2" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16 12.2v4" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  "there-will-be-blood": (
    <>
      <path d="M16 8.8v4.4M12.5 13.2h7M10.8 22.6h10.4M16 13.2l-4.4 9.4M16 13.2l4.4 9.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="16" cy="10.2" r="1.1" fill="currentColor" />
    </>
  ),
  "secreto-de-sus-ojos": (
    <>
      <path d="M8.8 16c2.6-4 5-6 7.2-6s4.6 2 7.2 6c-2.6 4-5 6-7.2 6s-4.6-2-7.2-6z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="16" cy="16" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="16" cy="16" r="0.9" fill="currentColor" />
    </>
  ),
  "the-father": (
    <>
      <rect x="9.2" y="9.4" width="13.6" height="13.2" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="11.6" y="11.6" width="9" height="8.8" fill="none" stroke="currentColor" strokeWidth="1.15" opacity="0.7" />
      <rect x="13.6" y="13.6" width="5.2" height="5" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.45" />
    </>
  ),
  "fanny-and-alexander": (
    <>
      <path d="M8.8 10.2c3.2 2 5.4 2 7.2 0 1.8 2 4 2 7.2 0v12.2c-3.2-2-5.4-2-7.2 0-1.8-2-4-2-7.2 0z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx="13.4" cy="16" r="1.1" fill="currentColor" />
      <circle cx="18.6" cy="16" r="1.1" fill="currentColor" />
    </>
  ),
  "paris-texas": (
    <>
      <path d="M8.6 20.8h14.8M10.4 20.8l5.6-11.4 5.6 11.4" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M14.4 14.8h3.2" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  "memories-of-murder": (
    <>
      <path d="M12.4 10.2h3.4v3.2h-3.4z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M15.8 13.4l8 9.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.2 22.6h8.4" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    </>
  ),
  "relatos-salvajes": (
    <>
      <path d="M16 8.8l1.6 4.6 4.8.2-3.8 3 1.4 4.6L16 18.6 12 21.2l1.4-4.6-3.8-3 4.8-.2z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </>
  ),
  "grand-budapest": (
    <>
      <rect x="10" y="12.2" width="12" height="10.4" rx="0.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 12.2l6-3.6 6 3.6M16 12.2v10.4M10 17.4h12" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </>
  ),
  "im-still-here": (
    <>
      <rect x="9.4" y="10.2" width="13.2" height="11.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.4 13.2h13.2" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="16" cy="18.2" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  persona: (
    <>
      <circle cx="13.4" cy="16" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="18.6" cy="16" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
  "perfect-blue": (
    <>
      <circle cx="16" cy="16" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M16 8.8v14.4M11.2 11.2l9.6 9.6M11.2 20.8l9.6-9.6" fill="none" stroke="currentColor" strokeWidth="1.15" />
    </>
  ),
  festen: (
    <>
      <path d="M12.2 11.2h7.6l-1.2 10.4h-5.2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M16 11.2V9.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  magnolia: (
    <>
      <path d="M10 12.2c1.6-1.2 3.4-1.8 6-1.8s4.4.6 6 1.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12.2 14.6v8M16 14.2v8.4M19.8 14.6v8" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="12.2" cy="23.2" r="0.9" fill="currentColor" />
      <circle cx="16" cy="23.4" r="0.9" fill="currentColor" />
      <circle cx="19.8" cy="23.2" r="0.9" fill="currentColor" />
    </>
  ),
  "in-the-mood-for-love": (
    <>
      <circle cx="16" cy="16" r="7.1" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M16 16l3.6-3.2M16 12.4V16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </>
  ),
  "amores-perros": (
    <>
      <path d="M10.2 18.2c0-3.8 2.4-6.6 5.8-6.6s5.8 2.8 5.8 6.6-2.2 6-5.8 6-5.8-2.2-5.8-6z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M11.2 12.4l-1.8-3.2M20.8 12.4l1.8-3.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="14.4" cy="17.4" r="0.7" fill="currentColor" />
      <circle cx="17.6" cy="17.4" r="0.7" fill="currentColor" />
    </>
  ),
  "nobody-knows": (
    <>
      <path d="M10.4 22.4V14l5.6-4.6 5.6 4.6v8.4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M14.4 22.4v-4.4h3.2v4.4" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </>
  ),
  dogville: (
    <>
      <rect x="9" y="10.4" width="14" height="11.4" fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 1.6" />
      <path d="M12.2 13.6l7.6 6.4M19.8 13.6l-7.6 6.4" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
  "boogie-nights": (
    <>
      <circle cx="16" cy="16" r="2.1" fill="currentColor" />
      <path d="M16 9.2v2.4M16 20.4v2.4M9.2 16h2.4M20.4 16h2.4M11.2 11.2l1.7 1.7M19.1 19.1l1.7 1.7M20.8 11.2l-1.7 1.7M12.9 19.1l-1.7 1.7" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </>
  ),
  "chungking-express": (
    <>
      <path d="M16 8.8c2.6 2.4 4.4 4.8 4.4 7.6 0 2.6-1.8 5.6-4.4 7-2.6-1.4-4.4-4.4-4.4-7 0-2.8 1.8-5.2 4.4-7.6z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13.6 16.4h4.8M16 13.8v5.4" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  "mulholland-drive": (
    <>
      <path d="M9 21.4c2.6-1.2 3.4-4.4 5.4-7.2 2-2.8 3.8-2.2 4.6.2 1 3 2.4 5.4 4.8 6.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="13.6" y="10.4" width="4.8" height="3.2" rx="0.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  "still-walking": (
    <>
      <circle cx="12.6" cy="11.6" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="19.2" cy="11.2" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M12.6 13.6v5.4l-1.8 4M12.6 16.4h2.4M19.2 13.2v5.8l1.8 4M19.2 16.2h-2.2" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </>
  ),
  "about-elly": (
    <>
      <path d="M8.8 18.6c2.6 2.2 5.4 3.4 7.2 3.4 1.8 0 4.6-1.2 7.2-3.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10.4 18.2c1.8-1.4 3.2-1.4 5.6 0 2.4-1.4 3.8-1.4 5.6 0" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="16" cy="12.2" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.4 1.2" />
    </>
  ),
  "fantastic-mr-fox": (
    <>
      <path d="M9.6 18.4c0-4 2.8-7.2 6.4-7.2s6.4 3.2 6.4 7.2-2.6 5.2-6.4 5.2-6.4-1.6-6.4-5.2z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M11.2 11.8l-1.6-3.4 4 2M20.8 11.8l1.6-3.4-4 2" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M16 16.8v3.2" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  amour: (
    <>
      <path d="M10.4 22.2v-6.4h4.2v6.4M17.4 22.2v-6.4h4.2v6.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.4 15.8h4.2M17.4 15.8h4.2" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
  arrival: (
    <>
      <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="16" cy="16" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.15" />
      <path d="M16 9v14M9 16h14" stroke="currentColor" strokeWidth="1.05" />
    </>
  ),
  "marriage-story": (
    <>
      <path d="M9.4 21.6V13l6.6-4.4V21.6M22.6 21.6V13l-6.6-4.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M16 8.6v13" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.6 1.4" />
    </>
  ),
  "perfect-days": (
    <>
      <circle cx="16" cy="11.4" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M16 14.2c3.6 2.2 5.6 5.2 5.6 8.4H10.4c0-3.2 2-6.2 5.6-8.4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
  "breaking-the-waves": (
    <>
      <path d="M12.4 10.4h7.2v2.2h-7.2zM16 12.6v6.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12.8 19h6.4s.8 3.6-3.2 3.6-3.2-3.6-3.2-3.6z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
  "little-miss-sunshine": (
    <>
      <path d="M8.8 18.4h14.4v4.2H8.8zM11.2 18.4V14h9.6v4.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="12.2" cy="22.6" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="19.8" cy="22.6" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  "a-prophet": (
    <>
      <path d="M10.2 9.4v13.2M13.4 9.4v13.2M16.6 9.4v13.2M19.8 9.4v13.2" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="16" cy="16" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
  "white-ribbon": (
    <>
      <path d="M16 9.2v6.4M13.2 15.6c0 3.4 2.8 6.8 2.8 6.8s2.8-3.4 2.8-6.8H13.2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M13.2 15.6h5.6" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
  poetry: (
    <>
      <path d="M10.4 10.2h11.2v12.2c-2.4-1.4-4.8-1.4-11.2 0z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M13 14.2h6M13 17h4.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  "like-father-like-son": (
    <>
      <circle cx="12.4" cy="12.4" r="2" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="19.6" cy="12.4" r="2" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="12.4" cy="20.2" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="19.6" cy="20.2" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12.4 14.6v3.4M19.6 14.6v3.4" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  nightcrawler: (
    <>
      <path d="M10.2 18.6h11.6l-2.2-6.4H12.4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="16" cy="15.4" r="2" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M13.4 12.2h2.2l.8-1.8h2.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  "get-out": (
    <>
      <path d="M11.2 14.6h9.6v8.2H11.2z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13.2 14.6c0-2.2 1.2-4.2 2.8-4.2s2.8 2 2.8 4.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M16 14.6v3.6" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  "call-me-by-your-name": (
    <>
      <path d="M16 10.2c3.2 2.6 5.2 5.2 5.2 7.8 0 2.6-2.2 4.8-5.2 4.8s-5.2-2.2-5.2-4.8c0-2.6 2-5.2 5.2-7.8z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M16 14.4v4.2M14.4 16.6h3.2" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  close: (
    <>
      <path d="M11.2 10.6v10.8M20.8 10.6v10.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13.4 16h5.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  monster: (
    <>
      <path d="M9.4 21.8h13.2L16 10.2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M13.6 21.8v-3.4h4.8v3.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
};

export const SALA_LIST_MARK_IDS = Object.keys(GLYPHS);

export function SalaListMark({ id, voted = false }: { id: string; voted?: boolean }) {
  return (
    <svg className={`salaMark${voted ? " isVoted" : ""}`} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {GLYPHS[id] ?? <circle cx="16" cy="16" r="2.4" fill="currentColor" />}
    </svg>
  );
}
