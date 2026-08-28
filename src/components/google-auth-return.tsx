"use client";

import { useEffect, useState } from "react";

import {
  completeGoogleRedirectIfNeeded,
  googleAuthMessage,
} from "@/lib/google-auth";

export function GoogleAuthReturn() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    completeGoogleRedirectIfNeeded().catch((caught) => {
      if (!cancelled) setError(googleAuthMessage(caught));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!error) return null;
  return (
    <p className="signInError authReturnError" role="alert">
      {error}
    </p>
  );
}
