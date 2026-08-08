"use client";

import { useActionState, useState } from "react";

import type { MemberSearchItem } from "@/lib/members";
import { FLOOR_PLACES, ROOM_ROWS } from "@/lib/room";
import type {
  GuestReservation,
  ScreeningOccupancy,
  WaitlistEntry,
} from "@/lib/screenings";

import {
  cancelGuestReservationAction,
  cancelGuestWaitlistAction,
  cancelOwnReservationAction,
  cancelOwnWaitlistAction,
  changeGuestSeatAction,
  changeOwnSeatAction,
  joinGuestWaitlistAction,
  joinOwnWaitlistAction,
  reserveGuestSeatAction,
  reserveOwnSeatAction,
  type ReservationActionState,
} from "./actions";

const initialState: ReservationActionState = { error: null, message: null };

function searchableName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function SeatMap({
  screeningId,
  occupancy,
  ownPlaceCode,
  ownReservationKind,
  guestReservation,
  ownWaitlistEntry,
  guestWaitlistEntry,
  waitlist,
  guestCandidates,
  blockedPlaceCodes,
  readOnly,
}: {
  screeningId: string;
  occupancy: ScreeningOccupancy[];
  ownPlaceCode: string | null;
  ownReservationKind: "self" | "guest" | null;
  guestReservation: GuestReservation | null;
  ownWaitlistEntry: WaitlistEntry | null;
  guestWaitlistEntry: WaitlistEntry | null;
  waitlist: WaitlistEntry[];
  guestCandidates: MemberSearchItem[];
  blockedPlaceCodes: string[];
  readOnly: boolean;
}) {
  const [mode, setMode] = useState<"self" | "guest">("self");
  const [selected, setSelected] = useState<string | null>(null);
  const [guestSeat, setGuestSeat] = useState<string | null>(null);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestMember, setGuestMember] = useState<MemberSearchItem | null>(null);
  const [reserveState, reserveAction, reservePending] = useActionState(
    reserveOwnSeatAction,
    initialState,
  );
  const [changeState, changeAction, changePending] = useActionState(
    changeOwnSeatAction,
    initialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelOwnReservationAction,
    initialState,
  );
  const [reserveGuestState, reserveGuestAction, reserveGuestPending] = useActionState(
    reserveGuestSeatAction,
    initialState,
  );
  const [changeGuestState, changeGuestAction, changeGuestPending] = useActionState(
    changeGuestSeatAction,
    initialState,
  );
  const [cancelGuestState, cancelGuestAction, cancelGuestPending] = useActionState(
    cancelGuestReservationAction,
    initialState,
  );
  const [joinWaitState, joinWaitAction, joinWaitPending] = useActionState(
    joinOwnWaitlistAction,
    initialState,
  );
  const [cancelWaitState, cancelWaitAction, cancelWaitPending] = useActionState(
    cancelOwnWaitlistAction,
    initialState,
  );
  const [joinGuestWaitState, joinGuestWaitAction, joinGuestWaitPending] = useActionState(
    joinGuestWaitlistAction,
    initialState,
  );
  const [cancelGuestWaitState, cancelGuestWaitAction, cancelGuestWaitPending] = useActionState(
    cancelGuestWaitlistAction,
    initialState,
  );
  const pending =
    reservePending ||
    changePending ||
    cancelPending ||
    reserveGuestPending ||
    changeGuestPending ||
    cancelGuestPending ||
    joinWaitPending ||
    cancelWaitPending ||
    joinGuestWaitPending ||
    cancelGuestWaitPending;
  const blockedPlaces = new Set(blockedPlaceCodes);
  const roomIsFull = occupancy.length + blockedPlaces.size >= 14;
  const hasPersonalBooking =
    ownReservationKind === "self" || ownWaitlistEntry?.kind === "self";
  const hasGuestBooking = Boolean(guestReservation || guestWaitlistEntry);
  const seatState = ownPlaceCode ? changeState : reserveState;
  const guestState = guestReservation ? changeGuestState : reserveGuestState;
  const occupancyByPlace = new Map(occupancy.map((place) => [place.placeCode, place]));
  const normalizedQuery = searchableName(guestQuery.trim());
  const matchingMembers = normalizedQuery
    ? guestCandidates
        .filter((candidate) => searchableName(candidate.name).includes(normalizedQuery))
        .slice(0, 8)
    : [];

  function chooseMode(nextMode: "self" | "guest") {
    setMode(nextMode);
    setSelected(null);
    setGuestSeat(null);
  }

  return (
    <div className="reservationForm">
      {!readOnly && hasPersonalBooking ? (
        <div className="reservationMode" aria-label="Qué reserva querés gestionar">
          <button
            aria-pressed={mode === "self"}
            className={mode === "self" ? "modeButton modeButtonActive" : "modeButton"}
            onClick={() => chooseMode("self")}
            type="button"
          >
            {ownPlaceCode
              ? `Mi lugar · ${ownPlaceCode}`
              : `Mi espera · #${ownWaitlistEntry?.position}`}
          </button>
          <button
            aria-pressed={mode === "guest"}
            className={mode === "guest" ? "modeButton modeButtonActive" : "modeButton"}
            onClick={() => chooseMode("guest")}
            type="button"
          >
            {guestReservation
              ? `Mi +1 · ${guestReservation.placeCode}`
              : guestWaitlistEntry
                ? `Mi +1 · espera #${guestWaitlistEntry.position}`
                : "Agregar un +1"}
          </button>
        </div>
      ) : null}

      {readOnly ? (
        <p className="closedNotice">
          Las reservas están cerradas. Podés consultar la distribución final, pero ya no modificarla.
        </p>
      ) : null}

      {ownReservationKind === "guest" ? (
        <p className="guestNotice">
          Este lugar fue reservado para vos como +1.{readOnly ? "" : " Podés cambiarlo o cancelarlo."}
        </p>
      ) : null}

      {ownWaitlistEntry?.kind === "guest" ? (
        <p className="guestNotice">Otra persona te agregó como +1. Estás en la posición {ownWaitlistEntry.position} de la lista de espera.</p>
      ) : null}

      {!readOnly && mode === "guest" && hasPersonalBooking && !hasGuestBooking ? (
        <section className="guestSearch">
          <div>
            <p className="kicker">Nombre obligatorio</p>
            <h3>¿Quién es tu +1?</h3>
            <p>Puede ser cualquier persona. Si ya es miembro, vas a poder elegirla de las sugerencias.</p>
          </div>
          <div className="guestSearchControl">
            <label htmlFor="guest-search">Nombre</label>
            <input
              autoComplete="off"
              id="guest-search"
              onChange={(event) => {
                setGuestQuery(event.target.value);
                setGuestMember(null);
              }}
              placeholder="Por ejemplo: Mauro"
              type="search"
              value={guestQuery}
            />
            {normalizedQuery ? (
              <div className="memberResults">
                {matchingMembers.length ? (
                  matchingMembers.map((candidate) => (
                    <button
                      className={
                        guestMember?.id === candidate.id
                          ? "memberResult memberResultSelected"
                          : "memberResult"
                      }
                      key={candidate.id}
                      onClick={() => {
                        setGuestMember(candidate);
                        setGuestQuery(candidate.name);
                      }}
                      type="button"
                    >
                      {candidate.name}
                    </button>
                  ))
                ) : (
                  <p>No hay coincidencias. Podés usar igualmente el nombre que escribiste.</p>
                )}
              </div>
            ) : null}
          </div>
          {guestMember ? (
            <p className="guestSelection">Vinculaste a <strong>{guestMember.name}</strong>, que ya es miembro. Ahora elegile un asiento.</p>
          ) : guestQuery.trim() ? (
            <p className="guestSelection">Se guardará a <strong>{guestQuery.trim()}</strong> como invitado externo. Ahora elegile un asiento.</p>
          ) : null}
        </section>
      ) : null}

      {mode === "guest" && guestReservation ? (
        <p className="guestNotice">
          Tu +1 es <strong>{guestReservation.memberName}</strong> y su asiento actual es <strong>{guestReservation.placeCode}</strong>.
        </p>
      ) : null}

      {mode === "guest" && guestWaitlistEntry ? (
        <p className="guestNotice">
          Tu +1 es <strong>{guestWaitlistEntry.displayName}</strong> y está en la posición <strong>{guestWaitlistEntry.position}</strong> de la lista de espera.
        </p>
      ) : null}

      <div className="roomMap">
        <div className="cinemaScreen"><span>Pantalla</span></div>

        <div className="seatRows">
          {ROOM_ROWS.map((row, rowIndex) => (
            <div className="seatRow" key={row[0].code}>
              <span className="rowLabel">{String.fromCharCode(65 + rowIndex)}</span>
              {row.map((place) => {
                const occupied = occupancyByPlace.get(place.code);
                const blocked = blockedPlaces.has(place.code);
                const mine = occupied?.isMine || ownPlaceCode === place.code;
                const myGuest = occupied?.isMyGuest;
                const isSelected =
                  mode === "guest" ? guestSeat === place.code : selected === place.code;
                const className = mine
                  ? "seat seatMine"
                  : myGuest
                    ? "seat seatGuest"
                    : occupied
                      ? "seat seatOccupied"
                      : blocked
                        ? "seat seatBlocked"
                      : isSelected
                        ? "seat seatSelected"
                        : "seat seatAvailable";

                return (
                  <button
                    aria-label={
                      mine
                        ? `${place.code}, reservado por mí`
                        : myGuest
                          ? `${place.code}, reservado para mi +1, ${occupied.memberName}`
                          : occupied
                            ? `${place.code}, ocupado por ${occupied.memberName}`
                            : blocked
                              ? `${place.code}, bloqueado por administración`
                            : `${place.code}, ${place.name}, disponible`
                    }
                    aria-pressed={isSelected}
                    className={className}
                    disabled={Boolean(occupied) || blocked || pending || readOnly}
                    key={place.code}
                    onClick={() => {
                      if (mode === "guest") setGuestSeat(place.code);
                      else setSelected(place.code);
                    }}
                    type="button"
                  >
                    <strong>{place.code}</strong>
                    <span>
                      {blocked
                        ? "Bloqueado"
                        : occupied
                        ? mine
                          ? "Tu lugar"
                          : myGuest
                            ? `${occupied.memberName} · +1`
                            : occupied.memberName
                        : place.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="aisle"><span>Pasillo</span></div>
        <div className="floorRow">
          {FLOOR_PLACES.map((place) => {
            const occupied = occupancyByPlace.get(place.code);
            const blocked = blockedPlaces.has(place.code);
            const mine = occupied?.isMine || ownPlaceCode === place.code;
            const myGuest = occupied?.isMyGuest;
            const isSelected =
              mode === "guest" ? guestSeat === place.code : selected === place.code;
            const className = mine
              ? "floorPlace floorMine"
              : myGuest
                ? "floorPlace floorGuest"
                : occupied
                  ? "floorPlace floorOccupied"
                  : blocked
                    ? "floorPlace floorBlocked"
                  : isSelected
                    ? "floorPlace floorSelected"
                    : "floorPlace floorAvailable";

            return (
              <button
                aria-label={
                  mine
                    ? `${place.code}, reservado por mí`
                    : myGuest
                      ? `${place.code}, reservado para mi +1, ${occupied.memberName}`
                      : occupied
                        ? `${place.code}, ocupado por ${occupied.memberName}`
                        : blocked
                          ? `${place.code}, bloqueado por administración`
                        : `${place.code}, ${place.name}, disponible en el piso`
                }
                aria-pressed={isSelected}
                className={className}
                disabled={Boolean(occupied) || blocked || pending || readOnly}
                key={place.code}
                onClick={() => {
                  if (mode === "guest") setGuestSeat(place.code);
                  else setSelected(place.code);
                }}
                type="button"
              >
                <strong>{place.code}</strong>
                <span>
                  {blocked
                    ? "Bloqueado"
                    : occupied
                    ? mine
                      ? "Tu lugar"
                      : myGuest
                        ? `${occupied.memberName} · +1`
                        : occupied.memberName
                    : place.name}
                </span>
                <small>Espacio de piso</small>
              </button>
            );
          })}
          <div className="entrance">Puerta de ingreso ↗</div>
        </div>
      </div>

      <div className="mapLegend" aria-label="Referencias">
        <span><i className="legendAvailable" /> Disponible</span>
        <span><i className="legendSelected" /> Seleccionado</span>
        <span><i className="legendOccupied" /> Ocupado</span>
        {blockedPlaces.size ? <span><i className="legendBlocked" /> Bloqueado</span> : null}
        <span><i className="legendMine" /> Tu lugar</span>
        <span><i className="legendGuest" /> Tu +1</span>
      </div>

      {!readOnly ? (
        mode === "self" || !hasPersonalBooking ? (
        <div className="reservationControls">
          {ownWaitlistEntry ? (
            <div className="waitlistControl">
              <p>Estás en la posición <strong>{ownWaitlistEntry.position}</strong> de la lista de espera.</p>
              <form action={cancelWaitAction} className="cancelReservationForm">
                <input name="screeningId" type="hidden" value={screeningId} />
                <button className="dangerButton" disabled={pending} type="submit">
                  {cancelWaitPending ? "Saliendo…" : "Salir de la lista de espera"}
                </button>
                {ownWaitlistEntry.kind === "self" && hasGuestBooking ? (
                  <small>También cancela la reserva o espera de tu +1.</small>
                ) : null}
              </form>
            </div>
          ) : roomIsFull && !ownPlaceCode ? (
            <form action={joinWaitAction} className="reservationSubmit">
              <input name="screeningId" type="hidden" value={screeningId} />
              <p>La sala está completa. Podés ocupar el próximo lugar de la lista.</p>
              <button className="primaryButton" disabled={pending || waitlist.length >= 5} type="submit">
                {joinWaitPending ? "Anotando…" : "Anotarme en lista de espera"}
              </button>
            </form>
          ) : (
            <form action={ownPlaceCode ? changeAction : reserveAction} className="reservationSubmit">
              <input name="screeningId" type="hidden" value={screeningId} />
              <input name="placeCode" type="hidden" value={selected ?? ""} />
              <p>
                {ownPlaceCode
                  ? selected
                    ? `Vas a cambiar ${ownPlaceCode} por ${selected}.`
                    : `Tu lugar actual es ${ownPlaceCode}. Elegí otro lugar para cambiarlo.`
                  : selected
                    ? `Elegiste ${selected}.`
                    : "Tocá un lugar disponible para elegirlo."}
              </p>
              <button className="primaryButton" disabled={!selected || pending} type="submit">
                {reservePending
                  ? "Reservando…"
                  : changePending
                    ? "Cambiando…"
                    : ownPlaceCode
                      ? "Confirmar cambio"
                      : "Confirmar mi lugar"}
              </button>
            </form>
          )}

          {ownPlaceCode ? (
            <form action={cancelAction} className="cancelReservationForm">
              <input name="screeningId" type="hidden" value={screeningId} />
              <button className="dangerButton" disabled={pending} type="submit">
                {cancelPending ? "Cancelando…" : "Cancelar mi reserva"}
              </button>
              {ownReservationKind === "self" && hasGuestBooking ? (
                <small>También cancela la reserva o espera de tu +1.</small>
              ) : null}
            </form>
          ) : null}
        </div>
      ) : (
        <div className="reservationControls">
          {guestWaitlistEntry ? (
            <div className="waitlistControl">
              <p><strong>{guestWaitlistEntry.displayName}</strong> está en la posición <strong>{guestWaitlistEntry.position}</strong>.</p>
              <form action={cancelGuestWaitAction} className="cancelReservationForm">
                <input name="screeningId" type="hidden" value={screeningId} />
                <button className="dangerButton" disabled={pending} type="submit">
                  {cancelGuestWaitPending ? "Sacando…" : "Sacar a mi +1 de la espera"}
                </button>
              </form>
            </div>
          ) : roomIsFull && !guestReservation ? (
            <form action={joinGuestWaitAction} className="reservationSubmit">
              <input name="screeningId" type="hidden" value={screeningId} />
              <input name="guestMemberId" type="hidden" value={guestMember?.id ?? ""} />
              <input name="guestName" type="hidden" value={guestMember?.name ?? guestQuery.trim()} />
              <p>La sala está completa. Tu +1 puede entrar en la lista de espera.</p>
              <button
                className="primaryButton"
                disabled={!guestQuery.trim() || pending || waitlist.length >= 5}
                type="submit"
              >
                {joinGuestWaitPending ? "Anotando…" : "Anotar a mi +1 en espera"}
              </button>
            </form>
          ) : (
            <form
              action={guestReservation ? changeGuestAction : reserveGuestAction}
              className="reservationSubmit"
            >
              <input name="screeningId" type="hidden" value={screeningId} />
              <input name="guestMemberId" type="hidden" value={guestMember?.id ?? ""} />
              <input name="guestName" type="hidden" value={guestMember?.name ?? guestQuery.trim()} />
              <input name="placeCode" type="hidden" value={guestSeat ?? ""} />
              <p>
                {guestReservation
                  ? guestSeat
                    ? `Vas a cambiar ${guestReservation.placeCode} por ${guestSeat}.`
                    : "Elegí otro lugar disponible para tu +1."
                  : guestQuery.trim() && guestSeat
                    ? `${guestMember?.name ?? guestQuery.trim()} va a ocupar ${guestSeat}.`
                    : "Escribí un nombre y después elegí un lugar disponible."}
              </p>
              <button
                className="primaryButton"
                disabled={!guestSeat || (!guestReservation && !guestQuery.trim()) || pending}
                type="submit"
              >
                {reserveGuestPending
                  ? "Reservando…"
                  : changeGuestPending
                    ? "Cambiando…"
                    : guestReservation
                      ? "Confirmar cambio del +1"
                      : "Confirmar reserva del +1"}
              </button>
            </form>
          )}

          {guestReservation ? (
            <form action={cancelGuestAction} className="cancelReservationForm">
              <input name="screeningId" type="hidden" value={screeningId} />
              <button className="dangerButton" disabled={pending} type="submit">
                {cancelGuestPending ? "Cancelando…" : "Cancelar solamente el +1"}
              </button>
            </form>
          ) : null}
        </div>
        )
      ) : null}

      {!readOnly && mode === "self" ? (
        <>
          {seatState.error ? <p className="formError" role="alert">{seatState.error}</p> : null}
          {seatState.message ? <p className="formSuccess" role="status">{seatState.message}</p> : null}
          {cancelState.error ? <p className="formError" role="alert">{cancelState.error}</p> : null}
          {cancelState.message ? <p className="formSuccess" role="status">{cancelState.message}</p> : null}
          {joinWaitState.error ? <p className="formError" role="alert">{joinWaitState.error}</p> : null}
          {joinWaitState.message ? <p className="formSuccess" role="status">{joinWaitState.message}</p> : null}
          {cancelWaitState.error ? <p className="formError" role="alert">{cancelWaitState.error}</p> : null}
          {cancelWaitState.message ? <p className="formSuccess" role="status">{cancelWaitState.message}</p> : null}
        </>
      ) : !readOnly ? (
        <>
          {guestState.error ? <p className="formError" role="alert">{guestState.error}</p> : null}
          {guestState.message ? <p className="formSuccess" role="status">{guestState.message}</p> : null}
          {cancelGuestState.error ? <p className="formError" role="alert">{cancelGuestState.error}</p> : null}
          {cancelGuestState.message ? <p className="formSuccess" role="status">{cancelGuestState.message}</p> : null}
          {joinGuestWaitState.error ? <p className="formError" role="alert">{joinGuestWaitState.error}</p> : null}
          {joinGuestWaitState.message ? <p className="formSuccess" role="status">{joinGuestWaitState.message}</p> : null}
          {cancelGuestWaitState.error ? <p className="formError" role="alert">{cancelGuestWaitState.error}</p> : null}
          {cancelGuestWaitState.message ? <p className="formSuccess" role="status">{cancelGuestWaitState.message}</p> : null}
        </>
      ) : null}

      {roomIsFull || waitlist.length ? (
        <section className="waitlistPanel">
          <div className="sectionHeading">
            <div>
              <p className="kicker">Capacidad completa</p>
              <h3>Lista de espera</h3>
            </div>
            <span>{waitlist.length} / 5</span>
          </div>
          {waitlist.length ? (
            <ol>
              {waitlist.map((entry) => (
                <li key={entry.reservationId}>
                  <span>{entry.position}</span>
                  <strong>{entry.displayName}</strong>
                  <small>{entry.isMine ? "Vos" : entry.isMyGuest ? "Tu +1" : "En espera"}</small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="emptyList">La lista está vacía.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
