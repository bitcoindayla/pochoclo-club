import {
  festivalMarkLabel,
  mergeFestivalMarks,
  type FestivalId,
  type FestivalMark,
} from "@/lib/festival-policy";

const MARK_SRC: Record<FestivalId, string> = {
  cannes: "/festivals/cannes.png",
  venice: "/festivals/venice.png",
  oscar: "/festivals/oscar.png",
  sansebastian: "/festivals/sansebastian.png",
};

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
            className={`festivalMark${mark.id === "oscar" ? " isOscar" : ""}${mark.result === "nominated" ? " isNominated" : ""}`}
            key={mark.id}
            title={label}
          >
            <img alt="" src={MARK_SRC[mark.id]} />
            <span className="festivalMarkLabel">{label}</span>
          </span>
        );
      })}
    </span>
  );
}
