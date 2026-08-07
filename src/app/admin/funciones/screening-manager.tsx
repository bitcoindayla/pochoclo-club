"use client";

import { useActionState } from "react";

import {
  closeScreeningAction,
  createScreeningAction,
  openScreeningAction,
  type ScreeningActionState,
} from "./actions";

const initialState: ScreeningActionState = { error: null, message: null };

export function CreateScreeningForm() {
  const [state, action, pending] = useActionState(createScreeningAction, initialState);

  return (
    <form action={action} className="screeningForm">
      <div className="fieldGroup">
        <label htmlFor="date">Fecha</label>
        <input id="date" name="date" required type="date" />
      </div>
      <div className="fieldGroup">
        <label htmlFor="time">Horario</label>
        <input id="time" name="time" required type="time" />
      </div>
      <div className="fieldGroup wideField">
        <label htmlFor="title">Título <span>opcional</span></label>
        <input id="title" maxLength={120} name="title" placeholder="La película de esta semana" />
      </div>
      <div className="fieldGroup wideField">
        <label htmlFor="message">Mensaje <span>opcional</span></label>
        <textarea
          id="message"
          maxLength={500}
          name="message"
          placeholder="Traigan algo para compartir…"
          rows={3}
        />
      </div>
      <button className="primaryButton" disabled={pending} type="submit">
        {pending ? "Creando…" : "Crear borrador"}
      </button>
      {state.error ? <p className="formError wideField" role="alert">{state.error}</p> : null}
      {state.message ? <p className="formSuccess wideField" role="status">{state.message}</p> : null}
    </form>
  );
}

export function CloseScreeningButton({ screeningId }: { screeningId: string }) {
  const [state, action, pending] = useActionState(closeScreeningAction, initialState);

  return (
    <form
      action={action}
      className="openScreeningForm"
      onSubmit={(event) => {
        if (!window.confirm("¿Cerrar las reservas? La función quedará solamente para consultar.")) {
          event.preventDefault();
        }
      }}
    >
      <input name="screeningId" type="hidden" value={screeningId} />
      <button className="dangerButton" disabled={pending} type="submit">
        {pending ? "Cerrando…" : "Cerrar reservas"}
      </button>
      {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
      {state.message ? <p className="formSuccess" role="status">{state.message}</p> : null}
    </form>
  );
}

export function OpenScreeningButton({ screeningId }: { screeningId: string }) {
  const [state, action, pending] = useActionState(openScreeningAction, initialState);

  return (
    <form action={action} className="openScreeningForm">
      <input name="screeningId" type="hidden" value={screeningId} />
      <button className="secondaryButton" disabled={pending} type="submit">
        {pending ? "Abriendo…" : "Abrir reservas"}
      </button>
      {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
      {state.message ? <p className="formSuccess" role="status">{state.message}</p> : null}
    </form>
  );
}
