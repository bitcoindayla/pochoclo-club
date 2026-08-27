"use client";

import { useActionState, useEffect, useState } from "react";

import { PopcornMark } from "@/components/popcorn-mark";
import type { MemberSearchItem } from "@/lib/members";
import {
  REPUTATION_TONE_LABEL,
  type Reputation,
} from "@/lib/reputation-policy";
import { AISLE_FLOOR_BY_ROW, placeDisplayLabel, ROOM_ROWS, type PlaceCode } from "@/lib/room";
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
  reservePartyAction,
  type ReservationActionState,
} from "./actions";

const initialState: ReservationActionState = { error: null, message: null };

function searchableName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function occupantReputation(
  occupied: ScreeningOccupancy | undefined,
  reputations: Record<string, Reputation>,
) {
  if (!occupied) return null;
  if (occupied.memberId.startsWith("external-")) return null;
  return reputations[occupied.memberId] ?? null;
}

function SeatMedal({
  name,
  guest,
  reputation,
}: {
  name: string;
  guest: boolean;
  reputation: Reputation | null;
}) {
  return (
    <div className={`seatMedal tone-${reputation?.tone ?? "seed"}`} aria-hidden="true">
      <div className="seatMedalTag">
        <strong>{name}</strong>
        <span className="seatMedalScore">
          <b>{reputation ? reputation.stars : "—"}</b>
          <PopcornMark className="seatMedalPopcorn" />
        </span>
        <em>{reputation ? REPUTATION_TONE_LABEL[reputation.tone] : "Invitado"}</em>
        {reputation ? (
          <dl>
            <div>
              <dt>Funciones</dt>
              <dd>{reputation.nights}</dd>
            </div>
            <div>
              <dt>Invitados</dt>
              <dd>{reputation.guests}</dd>
            </div>
            <div>
              <dt>Promedio</dt>
              <dd>{reputation.average == null ? "—" : reputation.average.toFixed(1)}</dd>
            </div>
          </dl>
        ) : guest ? (
          <small>+1 de la función</small>
        ) : null}
      </div>
    </div>
  );
}

export function SeatMap({
  screeningId,
  occupancy,
  reputations = {},
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
  reputations?: Record<string, Reputation>;
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
  const [selected, setSelected] = useState<string | null>(null);
  const [guestSeat, setGuestSeat] = useState<string | null>(null);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestMember, setGuestMember] = useState<MemberSearchItem | null>(null);
  const [reserveState, reserveAction, reservePending] = useActionState(
    reservePartyAction,
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
  const hasGuestBooking = Boolean(guestReservation || guestWaitlistEntry);
  const movingOwn = Boolean(ownPlaceCode && selected && selected !== ownPlaceCode);
  const addingOrMovingGuest = Boolean(
    guestSeat && guestSeat !== guestReservation?.placeCode,
  );
  const guestNameValue = guestMember?.name ?? guestQuery.trim();
  const seatState = ownPlaceCode ? changeState : reserveState;
  const guestState = guestReservation ? changeGuestState : reserveGuestState;
  const occupancyByPlace = new Map(occupancy.map((place) => [place.placeCode, place]));
  const normalizedQuery = searchableName(guestQuery.trim());

  useEffect(() => {
    const justBooked =
      reserveState.message ||
      reserveGuestState.message ||
      changeState.message ||
      changeGuestState.message;
    if (!justBooked) return;
    document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [
    reserveState.message,
    reserveGuestState.message,
    changeState.message,
    changeGuestState.message,
  ]);
  const matchingMembers = normalizedQuery
    ? guestCandidates
        .filter((candidate) => searchableName(candidate.name).includes(normalizedQuery))
        .slice(0, 8)
    : [];

  function pickPlace(code: PlaceCode) {
    if (readOnly || pending) return;

    if (ownPlaceCode === code) {
      setSelected((current) => (current === ownPlaceCode ? null : ownPlaceCode));
      setGuestSeat(null);
      return;
    }
    if (guestReservation?.placeCode === code) {
      setGuestSeat((current) => (current === code ? null : code));
      return;
    }

    if (selected === code) {
      setSelected(guestSeat);
      setGuestSeat(null);
      return;
    }
    if (guestSeat === code) {
      setGuestSeat(null);
      return;
    }

    if (!ownPlaceCode) {
      if (!selected) setSelected(code);
      else setGuestSeat(code);
      return;
    }

    if (selected === ownPlaceCode) {
      setSelected(code);
      return;
    }

    setGuestSeat(code);
  }

  function renderPlace(place: { code: PlaceCode; name: string }, kind: "seat" | "floor") {
    const occupied = occupancyByPlace.get(place.code);
    const blocked = blockedPlaces.has(place.code);
    const mine = occupied?.isMine || ownPlaceCode === place.code;
    const myGuest = occupied?.isMyGuest;
    const isOwnPick = selected === place.code;
    const isGuestPick = guestSeat === place.code;
    const prefix = kind === "floor" ? "floorPlace" : "seat";
    const className = mine && !isOwnPick
      ? `${prefix} ${kind === "floor" ? "floorMine" : "seatMine"}`
      : myGuest && !isGuestPick
        ? `${prefix} ${kind === "floor" ? "floorGuest" : "seatGuest"}`
        : occupied && !mine && !myGuest
          ? `${prefix} ${kind === "floor" ? "floorOccupied" : "seatOccupied"}`
          : blocked
            ? `${prefix} ${kind === "floor" ? "floorBlocked" : "seatBlocked"}`
            : isGuestPick
              ? `${prefix} ${kind === "floor" ? "floorGuest" : "seatGuest"}`
              : isOwnPick
                ? `${prefix} ${kind === "floor" ? "floorSelected" : "seatSelected"}`
                : `${prefix} ${kind === "floor" ? "floorAvailable" : "seatAvailable"}`;
    const lockedForOthers = Boolean(occupied && !mine && !myGuest);
    const reputation = occupantReputation(occupied, reputations);

    return (
      <div
        className={`seatWrap${occupied ? " isTaken" : ""}${reputation ? ` tone-${reputation.tone}` : occupied ? " tone-seed" : ""}`}
        key={place.code}
      >
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
                    : isGuestPick
                      ? `${place.code}, ${place.name}, elegido para tu +1`
                      : isOwnPick
                        ? `${place.code}, ${place.name}, tu lugar`
                        : kind === "floor"
                          ? `${place.code}, ${place.name}, disponible en el pasillo`
                          : `${place.code}, ${place.name}, disponible`
          }
          aria-pressed={isOwnPick || isGuestPick || mine || Boolean(myGuest)}
          className={className}
          data-place-code={place.code}
          disabled={lockedForOthers || blocked || pending || readOnly}
          onClick={() => pickPlace(place.code)}
          type="button"
        >
          <strong data-place-code={place.code}>{placeDisplayLabel(place.code)}</strong>
          <span>
            {blocked
              ? "Bloqueado"
              : occupied
                ? mine
                  ? "Tu lugar"
                  : myGuest
                    ? `${occupied.memberName} · +1`
                    : occupied.memberName
                : isGuestPick
                  ? "Tu +1"
                  : isOwnPick
                    ? "Tu lugar"
                    : place.name}
          </span>
          {kind === "floor" ? <small>Pasillo</small> : null}
        </button>
        {occupied ? (
          <SeatMedal
            guest={occupied.kind === "guest"}
            name={occupied.memberName}
            reputation={reputation}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="reservationForm">
      {readOnly ? (
        <p className="closedNotice">
          Las reservas están cerradas. Podés consultar la distribución final, pero ya no modificarla.
        </p>
      ) : ownReservationKind === "guest" ? (
        <p className="guestNotice">
          Este lugar fue reservado para vos como +1. Podés cambiarlo o cancelarlo.
        </p>
      ) : ownWaitlistEntry?.kind === "guest" ? (
        <p className="guestNotice">
          Otra persona te agregó como +1. Estás en la posición {ownWaitlistEntry.position} de la lista de espera.
        </p>
      ) : !ownPlaceCode ? (
        <p className="bookingHint">
          Tocá tu lugar. Si venís con alguien, tocá el segundo y escribí su nombre.
        </p>
      ) : null}

      <div className="roomMap">
        <div className="cinemaHeader">
          <div className="cinemaScreen"><span>Pantalla</span></div>
        </div>

        <div className="seatRows">
          {ROOM_ROWS.map((row, rowIndex) => {
            const aislePlace = AISLE_FLOOR_BY_ROW[rowIndex];
            return (
              <div className="seatRow" key={row[0].code}>
                <span className="rowLabel">{String.fromCharCode(65 + rowIndex)}</span>
                {row.slice(0, 2).map((place) => renderPlace(place, "seat"))}
                <div className="aisleSlot">
                  {aislePlace ? (
                    renderPlace(aislePlace, "floor")
                  ) : (
                    <span className="aisleGap" aria-hidden="true">
                      <span>Pasillo</span>
                    </span>
                  )}
                </div>
                {row.slice(2).map((place) => renderPlace(place, "seat"))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mapLegend" aria-label="Referencias">
        <span><i className="legendAvailable" /> Disponible</span>
        <span><i className="legendSelected" /> Tu lugar</span>
        <span><i className="legendGuest" /> Tu +1</span>
        <span><i className="legendOccupied" /> Ocupado</span>
        {blockedPlaces.size ? <span><i className="legendBlocked" /> Bloqueado</span> : null}
      </div>

      {!readOnly ? (
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
          ) : guestWaitlistEntry && !addingOrMovingGuest ? (
            <div className="waitlistControl">
              <p>
                <strong>{guestWaitlistEntry.displayName}</strong> está en la posición{" "}
                <strong>{guestWaitlistEntry.position}</strong>.
              </p>
              <form action={cancelGuestWaitAction} className="cancelReservationForm">
                <input name="screeningId" type="hidden" value={screeningId} />
                <button className="dangerButton" disabled={pending} type="submit">
                  {cancelGuestWaitPending ? "Sacando…" : "Sacar a mi +1 de la espera"}
                </button>
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
          ) : roomIsFull && ownPlaceCode && !guestReservation && guestNameValue ? (
            <form action={joinGuestWaitAction} className="reservationSubmit">
              <input name="screeningId" type="hidden" value={screeningId} />
              <input name="guestMemberId" type="hidden" value={guestMember?.id ?? ""} />
              <input name="guestName" type="hidden" value={guestNameValue} />
              <p>La sala está completa. Tu +1 puede entrar en la lista de espera.</p>
              <button className="primaryButton" disabled={pending || waitlist.length >= 5} type="submit">
                {joinGuestWaitPending ? "Anotando…" : "Anotar a mi +1 en espera"}
              </button>
            </form>
          ) : (
            <>
              {addingOrMovingGuest && !guestReservation ? (
                <div className="guestNameField">
                  <label htmlFor="guest-search">Nombre de tu +1</label>
                  <input
                    autoComplete="off"
                    id="guest-search"
                    onChange={(event) => {
                      setGuestQuery(event.target.value);
                      setGuestMember(null);
                    }}
                    placeholder="Cómo se llama"
                    type="text"
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
                        <p>No hay un miembro con ese nombre. Se guarda como está.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!ownPlaceCode && selected ? (
                <form action={reserveAction} className="reservationSubmit">
                  <input name="screeningId" type="hidden" value={screeningId} />
                  <input name="placeCode" type="hidden" value={selected} />
                  <input name="guestPlaceCode" type="hidden" value={guestSeat ?? ""} />
                  <input name="guestMemberId" type="hidden" value={guestMember?.id ?? ""} />
                  <input name="guestName" type="hidden" value={guestNameValue} />
                  <p>
                    {guestSeat
                      ? guestNameValue
                        ? `Vos en ${selected}, ${guestNameValue} en ${guestSeat}.`
                        : `Vos en ${selected}. Escribí el nombre de quien usa ${guestSeat}.`
                      : `Elegiste ${selected}. Tocá otro lugar si venís con +1.`}
                  </p>
                  <button
                    className="primaryButton"
                    disabled={pending || Boolean(guestSeat && !guestNameValue)}
                    type="submit"
                  >
                    {reservePending
                      ? "Reservando…"
                      : guestSeat
                        ? "Confirmar mis lugares"
                        : "Confirmar mi lugar"}
                  </button>
                </form>
              ) : movingOwn ? (
                <form action={changeAction} className="reservationSubmit">
                  <input name="screeningId" type="hidden" value={screeningId} />
                  <input name="placeCode" type="hidden" value={selected ?? ""} />
                  <p>Vas a cambiar {ownPlaceCode} por {selected}.</p>
                  <button className="primaryButton" disabled={pending} type="submit">
                    {changePending ? "Cambiando…" : "Confirmar cambio"}
                  </button>
                </form>
              ) : ownPlaceCode && addingOrMovingGuest && !guestReservation ? (
                <form action={reserveGuestAction} className="reservationSubmit">
                  <input name="screeningId" type="hidden" value={screeningId} />
                  <input name="placeCode" type="hidden" value={guestSeat ?? ""} />
                  <input name="guestMemberId" type="hidden" value={guestMember?.id ?? ""} />
                  <input name="guestName" type="hidden" value={guestNameValue} />
                  <p>
                    {guestNameValue
                      ? `${guestNameValue} va a ocupar ${guestSeat}.`
                      : `Escribí el nombre de quien usa ${guestSeat}.`}
                  </p>
                  <button className="primaryButton" disabled={pending || !guestNameValue} type="submit">
                    {reserveGuestPending ? "Reservando…" : "Confirmar el +1"}
                  </button>
                </form>
              ) : guestReservation && addingOrMovingGuest ? (
                <form action={changeGuestAction} className="reservationSubmit">
                  <input name="screeningId" type="hidden" value={screeningId} />
                  <input name="placeCode" type="hidden" value={guestSeat ?? ""} />
                  <p>
                    Vas a cambiar {guestReservation.placeCode} por {guestSeat} para{" "}
                    {guestReservation.memberName}.
                  </p>
                  <button className="primaryButton" disabled={pending} type="submit">
                    {changeGuestPending ? "Cambiando…" : "Confirmar cambio del +1"}
                  </button>
                </form>
              ) : (
                <p className={ownPlaceCode ? "formSuccess bookingStatus" : "bookingStatus"}>
                  {ownPlaceCode && guestReservation
                    ? `Selección completada. Vos en ${ownPlaceCode} y ${guestReservation.memberName} en ${guestReservation.placeCode}. Los dos lugares quedaron confirmados.`
                    : ownPlaceCode
                      ? `Selección completada. Reservaste el lugar ${ownPlaceCode}. Ya tenés tu butaca para la función.`
                      : "Tocá un lugar disponible para elegirlo."}
                </p>
              )}
            </>
          )}

          <div className="bookingCancels">
            {ownPlaceCode ? (
              <form action={cancelAction} className="cancelReservationForm">
                <input name="screeningId" type="hidden" value={screeningId} />
                <button className="dangerButton" disabled={pending} type="submit">
                  {cancelPending ? "Cancelando…" : "Cancelar mi reserva"}
                </button>
                {ownReservationKind === "self" && hasGuestBooking ? (
                  <small>También cancela el lugar o la espera de tu +1.</small>
                ) : null}
              </form>
            ) : null}
            {guestReservation ? (
              <form action={cancelGuestAction} className="cancelReservationForm">
                <input name="screeningId" type="hidden" value={screeningId} />
                <button className="dangerButton" disabled={pending} type="submit">
                  {cancelGuestPending ? "Cancelando…" : "Cancelar solo el +1"}
                </button>
              </form>
            ) : null}
            {selected || guestSeat ? (
              <button
                className="dangerButton"
                disabled={pending}
                onClick={() => {
                  setSelected(null);
                  setGuestSeat(null);
                }}
                type="button"
              >
                Deshacer selección
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!readOnly ? (
        <>
          {seatState.error ? <p className="formError" role="alert">{seatState.error}</p> : null}
          {reserveState.message ? <p className="formSuccess" role="status">{reserveState.message}</p> : null}
          {changeState.message ? <p className="formSuccess" role="status">{changeState.message}</p> : null}
          {guestState.error ? <p className="formError" role="alert">{guestState.error}</p> : null}
          {reserveGuestState.message ? <p className="formSuccess" role="status">{reserveGuestState.message}</p> : null}
          {changeGuestState.message ? <p className="formSuccess" role="status">{changeGuestState.message}</p> : null}
          {cancelState.error ? <p className="formError" role="alert">{cancelState.error}</p> : null}
          {cancelState.message ? <p className="formCancel" role="status">{cancelState.message}</p> : null}
          {cancelGuestState.error ? <p className="formError" role="alert">{cancelGuestState.error}</p> : null}
          {cancelGuestState.message ? <p className="formCancel" role="status">{cancelGuestState.message}</p> : null}
          {joinWaitState.error ? <p className="formError" role="alert">{joinWaitState.error}</p> : null}
          {joinWaitState.message ? <p className="formSuccess" role="status">{joinWaitState.message}</p> : null}
          {cancelWaitState.error ? <p className="formError" role="alert">{cancelWaitState.error}</p> : null}
          {cancelWaitState.message ? <p className="formSuccess" role="status">{cancelWaitState.message}</p> : null}
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
