import {
  festivalMarkLabel,
  mergeFestivalMarks,
  type FestivalId,
  type FestivalMark,
} from "@/lib/festival-policy";

function OscarMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 32">
      <circle cx="12" cy="3.85" r="2.85" />
      <path d="M4.7 9.05c4.4-2.2 10.2-2.2 14.6 0 .55.28.5 1.05-.12 1.25-2.15.7-4.55 1.1-7.18 1.1s-5.03-.4-7.18-1.1c-.62-.2-.67-.97-.12-1.25Z" />
      <path d="M8.35 10.9 10.7 19.1h2.6l2.35-8.2C13.85 11.35 12.9 11.55 12 11.55s-1.85-.2-3.65-.65Z" />
      <rect x="10.35" y="19.1" width="3.3" height="6.7" rx="0.55" />
      <ellipse cx="12" cy="27.4" rx="7.2" ry="2.2" />
      <rect x="4.8" y="27.4" width="14.4" height="1.4" />
      <ellipse cx="12" cy="28.8" rx="7.2" ry="2.2" />
    </svg>
  );
}

function CannesMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 32">
      <path d="M12.15 31.2c.42-6.4.55-12.55.28-17.7 2.55 1.7 5.7 4.35 7.55 7.85-1.2-5.05-4.2-8.85-7.55-11.35 3.2.28 6.45 1.55 8.75 4.05-2.55-4.85-7.15-7.7-11.45-8.55 1.95-1.22 3.7-3.15 4.55-5.45-3.05 1.95-5.85 2.85-8.35 2.85C4.55 2.7 2.2 1.85.2 1.55c1.05 2.15 2.45 3.95 4.2 5.2C1.7 7.95-1.55 11.35.15 16.1c2.1-2.45 5.2-3.85 8.15-4.35-3.15 2.65-5.7 6.45-6.15 10.95 2.15-3.15 5.4-5.4 8-6.6-.28 4.85-.4 9.7-.15 14.1h2Z" />
    </svg>
  );
}

function VeniceMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 28">
      <path d="M2.4 18.4C5.2 8.6 11.4 3.2 18.2 4.1c.55.08.85.7.5 1.15-1.85 2.4-3.15 5.15-3.55 8.15 1.7-.35 3.5-.2 5.15.55l.2-2.35c.08-.7.9-1.05 1.45-.55 1.7 1.55 2.7 3.7 2.7 6.05 0 1.15-.25 2.25-.7 3.25h-1.9c.35-.9.55-1.9.55-2.95 0-1.55-.55-2.95-1.5-4.05l-.15 1.85c1.15.85 1.9 2.2 1.9 3.7 0 2.55-2.05 4.6-4.6 4.6-3.7 0-6.85-2.05-8.55-5.05C7.6 20.4 5.4 22.1 3.3 24.6c-.45.55-1.3.3-1.4-.4-.25-1.95.05-4 .5-5.8Z" />
      <ellipse cx="22.6" cy="14.35" rx="5.1" ry="4.55" />
      <ellipse cx="26.7" cy="15.15" rx="3.35" ry="2.45" />
      <ellipse cx="20.3" cy="10.2" rx="1.7" ry="2.15" />
    </svg>
  );
}

function BerlinMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 32">
      <circle cx="7.6" cy="4.35" r="2.35" />
      <circle cx="16.4" cy="4.35" r="2.35" />
      <ellipse cx="12" cy="7.35" rx="5.35" ry="4.55" />
      <ellipse cx="12" cy="10.1" rx="3.15" ry="2.05" />
      <ellipse cx="4.55" cy="17.3" rx="2.35" ry="4.35" />
      <ellipse cx="19.45" cy="17.3" rx="2.35" ry="4.35" />
      <ellipse cx="12" cy="18.4" rx="6.35" ry="7.2" />
      <ellipse cx="8.15" cy="26.7" rx="2.55" ry="4.15" />
      <ellipse cx="15.85" cy="26.7" rx="2.55" ry="4.15" />
    </svg>
  );
}

function SanSebastianMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 24">
      <path d="M16 22.8 3.4 9.4Q4.2 4.2 9.2 4.6Q12.6 7.4 16 4.4Q19.4 7.4 22.8 4.6Q27.8 4.2 28.6 9.4Z" />
    </svg>
  );
}

function FestivalGlyph({ id }: { id: FestivalId }) {
  if (id === "oscar") return <OscarMark />;
  if (id === "cannes") return <CannesMark />;
  if (id === "venice") return <VeniceMark />;
  if (id === "berlin") return <BerlinMark />;
  return <SanSebastianMark />;
}

export function FestivalMarks({ marks }: { marks?: FestivalMark[] | null }) {
  const visible = mergeFestivalMarks(marks ?? []);
  if (!visible.length) return null;
  return (
    <span
      className="festivalMarks"
      aria-label={visible.map(festivalMarkLabel).join(". ")}
    >
      {visible.map((mark) => {
        const label = festivalMarkLabel(mark);
        return (
          <span
            className={`festivalMark${mark.result === "nominated" ? " isNominated" : ""}`}
            key={mark.id}
            title={label}
          >
            <FestivalGlyph id={mark.id} />
            <span className="festivalMarkLabel">{label}</span>
          </span>
        );
      })}
    </span>
  );
}
