"use client";

import { useActionState } from "react";

import {
  setMemberActiveAction,
  updateAttendanceAction,
  updateMemberNameAction,
  type MemberActionState,
} from "./actions";

const initial: MemberActionState = { error: null, message: null };

function Feedback({ state }: { state: MemberActionState }) {
  if (state.error) return <p className="formError">{state.error}</p>;
  if (state.message) return <p className="formSuccess">{state.message}</p>;
  return null;
}

export function MemberNameForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(updateMemberNameAction, initial);
  return (
    <form action={action} className="memberNameForm">
      <input name="id" type="hidden" value={id} />
      <label htmlFor="member-name">Nombre en el club</label>
      <div className="memberNameRow">
        <input defaultValue={name} id="member-name" maxLength={100} name="name" required />
        <button className="smallButton" disabled={pending} type="submit">
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function MemberActiveForm({
  id,
  active,
  disabled,
  lastAdmin,
}: {
  id: string;
  active: boolean;
  disabled?: boolean;
  lastAdmin?: boolean;
}) {
  const [state, action, pending] = useActionState(setMemberActiveAction, initial);
  return (
    <form action={action} className="compactActions">
      <input name="id" type="hidden" value={id} />
      <input name="active" type="hidden" value={active ? "false" : "true"} />
      <button
        className={active ? "dangerLink" : "smallButton"}
        disabled={pending || disabled}
        title={lastAdmin ? "Es el único administrador." : undefined}
        type="submit"
      >
        {pending ? "Cambiando…" : active ? "Desactivar" : "Reactivar"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function AttendanceToggle({
  filmId,
  personId,
  memberId,
  status,
}: {
  filmId: string;
  personId: string;
  memberId: string;
  status: "presente" | "ausente";
}) {
  const [state, action, pending] = useActionState(updateAttendanceAction, initial);
  return (
    <form action={action} className="compactActions">
      <input name="filmId" type="hidden" value={filmId} />
      <input name="personId" type="hidden" value={personId} />
      <input name="memberId" type="hidden" value={memberId} />
      <input name="status" type="hidden" value={status === "presente" ? "ausente" : "presente"} />
      <button className="smallButton" disabled={pending} type="submit">
        {pending ? "…" : status === "presente" ? "Marcar ausente" : "Marcar presente"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
