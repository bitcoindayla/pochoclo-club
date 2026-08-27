"use client";

import { useActionState } from "react";

import { CRITIQUE_CATEGORIES } from "@/lib/critique-policy";

import {
  addLegacyFilmAction,
  openCritiqueAction,
  publishOccupancyScoresAction,
  type CritiqueActionState,
} from "./actions";

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

export function OccupancyScoreForm({
  director,
  occupants,
  screeningId,
  title,
  year,
}: {
  director: string;
  occupants: Array<{
    personId: string;
    name: string;
    kind: "self" | "guest";
    hostName: string | null;
    placeCode: string;
  }>;
  screeningId: string;
  title: string;
  year: string;
}) {
  const [state, action, pending] = useActionState(publishOccupancyScoresAction, initial);
  return (
    <form action={action} className="scoreSheet">
      <input name="screeningId" type="hidden" value={screeningId} />
      <div className="screeningForm">
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
      </div>
      <p className="pageIntro">
        Cinco notas del 0 al 10 por quien estuvo. Si alguien reservó y no vino, dejalo vacío: queda
        ausente.
      </p>
      <ul className="scorePeople">
        {occupants.map((person) => (
          <li className="scorePerson" key={person.personId}>
            <div>
              <strong>{person.name}</strong>
              <small>
                {person.placeCode}
                {person.kind === "guest" && person.hostName ? ` · +1 de ${person.hostName}` : ""}
              </small>
            </div>
            <div className="scoreCats">
              {CRITIQUE_CATEGORIES.map((category) => (
                <label key={category.id}>
                  {category.label}
                  <select defaultValue="" name={`score:${person.personId}:${category.id}`}>
                    <option value="">—</option>
                    {Array.from({ length: 11 }, (_, score) => (
                      <option key={score} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button className="primaryButton" disabled={pending} type="submit">
        {pending ? "Publicando…" : "Publicar puntajes"}
      </button>
      {state.error ? <p className="formError">{state.error}</p> : null}
      {state.message ? <p className="formSuccess">{state.message}</p> : null}
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
