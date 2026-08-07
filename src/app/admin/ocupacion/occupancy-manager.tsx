"use client";

import { useActionState } from "react";

import { ALL_PLACE_CODES, type PlaceCode } from "@/lib/room";
import type { ScreeningOccupancy, WaitlistEntry } from "@/lib/screenings";

import {
  blockPlaceAction,
  cancelReservationAdminAction,
  cancelWaitlistAdminAction,
  moveReservationAction,
  reorderWaitlistAction,
  unblockPlaceAction,
  type OccupancyActionState,
} from "./actions";

const initialState: OccupancyActionState = { error: null, message: null };

export function OccupancyManager({
  screeningId,
  occupancy,
  waitlist,
  blockedPlaceCodes,
  placeNames,
  readOnly,
}: {
  screeningId: string;
  occupancy: ScreeningOccupancy[];
  waitlist: WaitlistEntry[];
  blockedPlaceCodes: PlaceCode[];
  placeNames: Record<PlaceCode, string>;
  readOnly: boolean;
}) {
  const [moveState, moveAction, movePending] = useActionState(
    moveReservationAction,
    initialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelReservationAdminAction,
    initialState,
  );
  const [cancelWaitState, cancelWaitAction, cancelWaitPending] = useActionState(
    cancelWaitlistAdminAction,
    initialState,
  );
  const [blockState, blockAction, blockPending] = useActionState(
    blockPlaceAction,
    initialState,
  );
  const [unblockState, unblockAction, unblockPending] = useActionState(
    unblockPlaceAction,
    initialState,
  );
  const [reorderState, reorderAction, reorderPending] = useActionState(
    reorderWaitlistAction,
    initialState,
  );
  const pending =
    movePending ||
    cancelPending ||
    cancelWaitPending ||
    blockPending ||
    unblockPending ||
    reorderPending;
  const occupiedByPlace = new Map(occupancy.map((entry) => [entry.placeCode, entry]));
  const blockedPlaces = new Set(blockedPlaceCodes);
  const availablePlaces = ALL_PLACE_CODES.filter(
    (code) => !occupiedByPlace.has(code) && !blockedPlaces.has(code),
  );
  const states = [
    moveState,
    cancelState,
    cancelWaitState,
    blockState,
    unblockState,
    reorderState,
  ];
  const feedback = [...states].reverse().find((state) => state.error || state.message);

  return (
    <>
      {!readOnly && feedback?.error ? <p className="formError adminFeedback" role="alert">{feedback.error}</p> : null}
      {!readOnly && feedback?.message ? <p className="formSuccess adminFeedback" role="status">{feedback.message}</p> : null}

      <section className="occupancySection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">Sala</p>
            <h2>Lugares</h2>
          </div>
          <span>{availablePlaces.length} disponibles</span>
        </div>

        <div className="tableScroll">
          <table className="occupancyTable">
            <thead>
              <tr>
                <th>Lugar</th>
                <th>Estado</th>
                <th>Persona</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ALL_PLACE_CODES.map((placeCode) => {
                const occupant = occupiedByPlace.get(placeCode);
                const blocked = blockedPlaces.has(placeCode);
                return (
                  <tr key={placeCode}>
                    <td data-label="Lugar">
                      <strong>{placeCode}</strong>
                      <small>{placeNames[placeCode]}</small>
                    </td>
                    <td data-label="Estado">
                      <span className={`status ${occupant ? "status-used" : blocked ? "status-blocked" : "status-available"}`}>
                        {occupant ? "Ocupado" : blocked ? "Bloqueado" : "Disponible"}
                      </span>
                    </td>
                    <td data-label="Persona">
                      {occupant ? (
                        <>
                          <strong>{occupant.memberName}</strong>
                          <small>
                            {occupant.kind === "guest"
                              ? `+1 · reservó ${occupant.bookedByName}`
                              : `Reservó ${occupant.bookedByName}`}
                          </small>
                        </>
                      ) : (
                        <span className="mutedText">—</span>
                      )}
                    </td>
                    <td data-label="Acciones">
                      {readOnly ? (
                        <span className="mutedText">Solo lectura</span>
                      ) : occupant ? (
                        <div className="compactActions">
                          <form action={moveAction} className="moveForm">
                            <input name="screeningId" type="hidden" value={screeningId} />
                            <input name="reservationId" type="hidden" value={occupant.memberId} />
                            <label className="srOnly" htmlFor={`move-${placeCode}`}>Nuevo lugar para {occupant.memberName}</label>
                            <select defaultValue="" id={`move-${placeCode}`} name="placeCode" required>
                              <option disabled value="">Mover a…</option>
                              {availablePlaces.map((code) => <option key={code} value={code}>{code}</option>)}
                            </select>
                            <button className="smallButton" disabled={pending || !availablePlaces.length} type="submit">Mover</button>
                          </form>
                          <form action={cancelAction}>
                            <input name="screeningId" type="hidden" value={screeningId} />
                            <input name="reservationId" type="hidden" value={occupant.memberId} />
                            <button className="dangerLink" disabled={pending} type="submit">Cancelar</button>
                          </form>
                        </div>
                      ) : blocked ? (
                        <form action={unblockAction}>
                          <input name="screeningId" type="hidden" value={screeningId} />
                          <input name="placeCode" type="hidden" value={placeCode} />
                          <button className="smallButton" disabled={pending} type="submit">Desbloquear</button>
                        </form>
                      ) : (
                        <form action={blockAction}>
                          <input name="screeningId" type="hidden" value={screeningId} />
                          <input name="placeCode" type="hidden" value={placeCode} />
                          <button className="smallButton" disabled={pending} type="submit">Bloquear</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="occupancySection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">Prioridad</p>
            <h2>Lista de espera</h2>
          </div>
          <span>{waitlist.length} de 5</span>
        </div>

        {waitlist.length ? (
          <ol className="adminWaitlist">
            {waitlist.map((entry, index) => (
              <li key={entry.reservationId}>
                <span className="waitPosition">{index + 1}</span>
                <div className="waitIdentity">
                  <strong>{entry.displayName}</strong>
                  {entry.kind === "guest" ? <small>+1 de {entry.bookedByName}</small> : <small>Miembro</small>}
                </div>
                {readOnly ? <span className="mutedText">Solo lectura</span> : <div className="compactActions">
                  <form action={reorderAction}>
                    <input name="screeningId" type="hidden" value={screeningId} />
                    <input name="reservationId" type="hidden" value={entry.reservationId} />
                    <input name="direction" type="hidden" value="up" />
                    <button aria-label={`Subir a ${entry.displayName}`} className="smallButton" disabled={pending || index === 0} type="submit">↑</button>
                  </form>
                  <form action={reorderAction}>
                    <input name="screeningId" type="hidden" value={screeningId} />
                    <input name="reservationId" type="hidden" value={entry.reservationId} />
                    <input name="direction" type="hidden" value="down" />
                    <button aria-label={`Bajar a ${entry.displayName}`} className="smallButton" disabled={pending || index === waitlist.length - 1} type="submit">↓</button>
                  </form>
                  <form action={cancelWaitAction}>
                    <input name="screeningId" type="hidden" value={screeningId} />
                    <input name="reservationId" type="hidden" value={entry.reservationId} />
                    <button className="dangerLink" disabled={pending} type="submit">Quitar</button>
                  </form>
                </div>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="emptyList">No hay nadie en lista de espera.</p>
        )}
      </section>
    </>
  );
}
