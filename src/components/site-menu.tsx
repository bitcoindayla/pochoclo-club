"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import type { LandingVisual } from "@/lib/landing";

export type MenuLink = {
  href: string;
  label: string;
};

export function SiteMenu({
  links,
  visual,
}: {
  links: MenuLink[];
  visual: LandingVisual | null;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button className="menuTrigger" onClick={() => setOpen(true)} type="button">
        Menu
      </button>
      {open ? (
        <div className="siteMenu" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="siteMenuPanel">
            <button className="menuClose" onClick={() => setOpen(false)} type="button">
              <span aria-hidden="true">×</span> Close
            </button>
            <h2 className="srOnly" id={titleId}>
              Navegación
            </h2>
            <nav className="siteMenuNav">
              {links.map((link) => (
                <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="siteMenuStill" aria-hidden="true">
            {visual ? (
              <picture>
                <source media="(max-width: 800px)" srcSet={visual.portraitUrl} />
                <img alt="" src={visual.landscapeUrl} />
              </picture>
            ) : (
              <div className="landingFallback" />
            )}
            <strong className="siteMenuMark">
              Pochoclo <i>Club</i>
            </strong>
          </div>
        </div>
      ) : null}
    </>
  );
}
