"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  REPUTATION_RATIONALE,
  REPUTATION_RATIONALE_TITLE,
} from "@/lib/reputation-policy";

export function ReputationHelp() {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className={`repHelp${open ? " isOpen" : ""}`} ref={rootRef}>
      <button
        aria-controls={tipId}
        aria-expanded={open}
        aria-label={REPUTATION_RATIONALE_TITLE}
        className="repHelpButton"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        ?
      </button>
      <span className="repHelpTip" id={tipId} role="tooltip">
        <strong>{REPUTATION_RATIONALE_TITLE}</strong>
        {REPUTATION_RATIONALE.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </span>
    </span>
  );
}
