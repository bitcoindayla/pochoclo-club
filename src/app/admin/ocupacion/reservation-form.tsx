"use client";

import { useActionState, useState } from "react";

import { placeDisplayLabel, type PlaceCode } from "@/lib/room";
import type { ScreeningOccupancy, WaitlistEntry } from "@/lib/screenings";

import { reserveSeatAdminAction, type OccupancyActionState } from "./actions";

export type ReservationMember = { id: string; name: string; email: string };
const initial: OccupancyActionState = { error: null, message: null };
const modes = [
  { id: "member", label: "Miembro del club" },
  { id: "name", label: "Solo nombre" },
  { id: "account", label: "Nombre y mail" },
] as const;

const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

export function AdminReservationForm({
  screeningId, members, occupancy, waitlist, availablePlaces, placeCode, onPlaceChange, onBusy, disabled,
}: {
  screeningId: string;
  members: ReservationMember[];
  occupancy: ScreeningOccupancy[];
  waitlist: WaitlistEntry[];
  availablePlaces: PlaceCode[];
  placeCode: string;
  onPlaceChange: (value: string) => void;
  onBusy: (value: boolean) => void;
  disabled: boolean;
}) {
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("member");
  const [query, setQuery] = useState("");
  const [memberId, setMemberId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requestId, setRequestId] = useState("");
  const [state, action, pending] = useActionState(async (previous: OccupancyActionState, formData: FormData) => {
    onBusy(true);
    try {
      // Retain the key on errors: a retry after a lost response cannot create a second person.
      const id = requestId || crypto.randomUUID();
      setRequestId(id);
      formData.set("requestId", id);
      const result = await reserveSeatAdminAction(previous, formData);
      if (result.message) {
        setMemberId(""); setName(""); setEmail(""); setQuery(""); setRequestId(""); onPlaceChange("");
      }
      return result;
    } catch {
      return { error: "No pudimos confirmar la reserva. Reintentá con estos mismos datos.", message: null };
    } finally { onBusy(false); }
  }, initial);
  const reserved = new Map(occupancy.map((row) => [row.memberId, row.placeCode]));
  const waiting = new Set(waitlist.map((row) => row.memberId));
  const selectedMember = members.find((member) => member.id === memberId);
  const matching = members.filter((member) => searchable(`${member.name} ${member.email}`).includes(searchable(query.trim())));
  const knownEmail = members.find((member) => member.email.toLowerCase() === email.trim().toLowerCase());
  const available = availablePlaces.includes(placeCode as PlaceCode);
  const validPerson = mode === "member" ? Boolean(selectedMember && !reserved.has(memberId) && !waiting.has(memberId)) : Boolean(name.trim());

  return (
    <section className="adminReservation" id="admin-reservation">
      <div className="sectionHeading">
        <div><p className="kicker">Desde administración</p><h2>Reservar para alguien</h2></div>
        {available ? <strong className="adminReservationPlace">{placeDisplayLabel(placeCode)}</strong> : null}
      </div>
      <p className="pageIntro">Elegí el lugar y a quién se lo asignás. La reserva queda a nombre de esa persona.</p>
      <form action={action} onReset={(event) => event.preventDefault()}>
        <input name="screeningId" type="hidden" value={screeningId} />
        <input name="mode" type="hidden" value={mode} />
        <fieldset disabled={pending || disabled || availablePlaces.length === 0}>
          <legend className="srOnly">Datos de la reserva administrativa</legend>
          <label className="adminReservationSeat">Lugar
            <select name="placeCode" required value={available ? placeCode : ""} onChange={(event) => onPlaceChange(event.target.value)}>
              <option value="">Elegí un lugar libre…</option>
              {availablePlaces.map((code) => <option key={code} value={code}>{placeDisplayLabel(code)}</option>)}
            </select>
          </label>
          <div className="adminReservationModes" role="group" aria-label="Cómo registrar a la persona">
            {modes.map((option) => <button aria-pressed={mode === option.id} className={mode === option.id ? "isSelected" : ""} key={option.id} onClick={() => setMode(option.id)} type="button">{option.label}</button>)}
          </div>
          {mode === "member" ? (
            <div className="adminMemberPicker">
              <label>Buscar miembro<input onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o mail" type="search" value={query} /></label>
              <label>Miembro
                <select name="memberId" onChange={(event) => setMemberId(event.target.value)} required value={memberId}>
                  <option value="">Seleccioná una persona…</option>
                  {selectedMember && !matching.includes(selectedMember) ? <option value={selectedMember.id}>{selectedMember.name} · {selectedMember.email}</option> : null}
                  {matching.map((member) => (
                    <option disabled={reserved.has(member.id) || waiting.has(member.id)} key={member.id} value={member.id}>
                      {member.name} · {member.email}{reserved.has(member.id) ? ` · Ya tiene ${reserved.get(member.id)}` : waiting.has(member.id) ? " · En lista de espera" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {matching.length === 0 ? <p className="adminReservationHint">No hay coincidencias. Podés cargar a la persona con nombre y mail.</p> : null}
            </div>
          ) : (
            <div className="adminReservationIdentity">
              <label>Nombre<input autoComplete="off" maxLength={100} name="name" onChange={(event) => setName(event.target.value)} required value={name} /></label>
              {mode === "account" ? <label>Mail<input autoComplete="off" maxLength={254} name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label> : null}
              <p className="adminReservationHint">{mode === "name"
                ? "Queda una reserva independiente para esta función. Puede participar de la crítica desde el QR."
                : knownEmail ? `Ese mail ya pertenece a ${knownEmail.name}. La reserva se asignará a su cuenta actual.`
                  : "Se crea su ficha del club. Podrá entrar con Google usando este mail y encontrará su reserva."}</p>
            </div>
          )}
          {mode !== "name" ? <p className="adminReservationHint">Si todavía no votó, se registra una excepción para esta función.</p> : null}
          <button className="primaryButton" disabled={!available || !validPerson} type="submit">
            {pending ? "Reservando…" : available ? `Reservar ${placeDisplayLabel(placeCode)}` : "Elegí un lugar para reservar"}
          </button>
          {requestId ? <button className="smallButton" onClick={() => {
            setRequestId(""); setMemberId(""); setName(""); setEmail(""); setQuery(""); onPlaceChange("");
          }} type="button">Limpiar e iniciar otra reserva</button> : null}
        </fieldset>
        {availablePlaces.length === 0 ? <p className="adminReservationHint">No quedan lugares libres. Podés gestionar los bloqueos y la espera más abajo.</p> : null}
        {state.error ? <p className="formError" role="alert">{state.error}</p> : null}
        {state.message ? <p className="formSuccess" role="status">{state.message}</p> : null}
      </form>
    </section>
  );
}
