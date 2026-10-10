"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Brand } from "@/components/brand";
import { DirectorMosaic } from "@/components/director-mosaic";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { LandingAccess } from "@/components/landing-access";
import type { DirectorGroup } from "@/lib/director-mosaic";
import { TASTE_GATE_MIN_FILMS, tasteProgressCopy } from "@/lib/taste-gate-policy";

import { requestTasteInviteAction } from "./actions";

const STORAGE_KEY = "pochoclo.taste-invite";

export function TasteGate({ directors }: { directors: DirectorGroup[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const claiming = useRef(false);

  const count = selected.length;
  const unlocked = count >= TASTE_GATE_MIN_FILMS;
  const token = useMemo(() => {
    if (!inviteUrl) return null;
    try {
      return new URL(inviteUrl).pathname.split("/").pop() ?? null;
    } catch {
      return null;
    }
  }, [inviteUrl]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { url?: string; selected?: string[] };
      if (typeof parsed.url === "string") setInviteUrl(parsed.url);
      if (Array.isArray(parsed.selected)) {
        setSelected(parsed.selected.filter((id): id is string => typeof id === "string"));
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!unlocked || inviteUrl || error || claiming.current) return;
    claiming.current = true;
    setPending(true);
    const ids = selected;
    requestTasteInviteAction(ids).then((result) => {
      if (result.url) {
        setInviteUrl(result.url);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ url: result.url, selected: ids }));
      } else {
        setError(result.error);
      }
      setPending(false);
    });
  }, [unlocked, inviteUrl, error, selected]);

  function toggleFilm(filmId: string) {
    setSelected((current) => {
      const next = current.includes(filmId)
        ? current.filter((id) => id !== filmId)
        : [...current, filmId];
      return next;
    });
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <header className="directorHeader">
        <div className="directorHeaderLeft">
          <span className="directorHeaderCaption">
            ¿Viste diez de estas?
            <span>Tocá las que ya cruzaste. El archivo decide.</span>
          </span>
        </div>
        <Brand />
        <div className="directorHeaderAccess">
          <LandingAccess compact join={false} />
        </div>
      </header>
      <DirectorMosaic
        directors={directors}
        selectedIds={selected}
        onToggleFilm={toggleFilm}
      />
      <aside className="tasteDock" aria-live="polite">
        <div className="tasteDockCopy">
          <p className="tasteCount">
            <b>{count}</b>
            <span>/ {TASTE_GATE_MIN_FILMS}</span>
          </p>
          <p>{tasteProgressCopy(count)}</p>
          {error ? (
            <p className="tasteDockError" role="alert">
              {error}{" "}
              <button
                className="tasteRetry"
                type="button"
                onClick={() => {
                  claiming.current = false;
                  setError(null);
                }}
              >
                Reintentar
              </button>
            </p>
          ) : null}
        </div>
        {inviteUrl && token ? (
          <div className="tasteDockInvite">
            <GoogleSignInButton dark invitationToken={token} label="Entrar con Google" />
            <button className="tasteCopy" onClick={copyInvite} type="button">
              {copied ? "Listo, copiado" : "Copiar invitación"}
            </button>
          </div>
        ) : pending && unlocked ? (
          <p className="tasteDockWait">Armando tu pase…</p>
        ) : null}
      </aside>
    </>
  );
}
