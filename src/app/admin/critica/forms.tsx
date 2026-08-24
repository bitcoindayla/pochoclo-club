"use client";

import { useActionState } from "react";

import { addLegacyFilmAction, openCritiqueAction, type CritiqueActionState } from "./actions";

const initial: CritiqueActionState = { error: null, message: null };

export function OpenCritiqueForm({
  director,
  occupancy,
  screeningId,
  title,
  year,
}: {
  director: string;
  occupancy: number;
  screeningId: string;
  title: string;
  year: string;
}) {
  const [state, action, pending] = useActionState(openCritiqueAction, initial);
  return (
    <form action={action} className="screeningForm">
      <input name="screeningId" type="hidden" value={screeningId} />
      <label>
        Título
        <input defaultValue={title} name="title" required />
      </label>
      <label>
        Año
        <input defaultValue={year} inputMode="numeric" name="year" required />
      </label>
      <label className="wideField">
        Dirección
        <input defaultValue={director} name="director" required />
      </label>
      <p className="pageIntro">{occupancy} personas en la sala van a puntuar.</p>
      <button className="primaryButton" disabled={pending} type="submit">
        {pending ? "Abriendo…" : "Mostrar QR en la sala"}
      </button>
      {state.error ? <p className="formError">{state.error}</p> : null}
    </form>
  );
}

export function LegacyFilmForm() {
  const [state, action, pending] = useActionState(addLegacyFilmAction, initial);
  return (
    <form action={action} className="screeningForm">
      <label>
        Fecha
        <input name="watchedAt" required type="date" />
      </label>
      <label>
        Año
        <input inputMode="numeric" name="year" required />
      </label>
      <label className="wideField">
        Título
        <input name="title" required />
      </label>
      <label>
        Dirección
        <input name="director" required />
      </label>
      <label>
        Puntaje
        <input inputMode="decimal" max={10} min={0} name="score" required step="0.1" />
      </label>
      <button className="primaryButton" disabled={pending} type="submit">
        {pending ? "Guardando…" : "Agregar al historial"}
      </button>
      {state.error ? <p className="formError">{state.error}</p> : null}
      {state.message ? <p className="formSuccess">{state.message}</p> : null}
    </form>
  );
}
