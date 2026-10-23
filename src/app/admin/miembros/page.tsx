import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { ReputationMark } from "@/components/reputation-mark";
import { SignOutButton } from "@/components/session-actions";
import { requireAdmin } from "@/lib/authz";
import { listInvitations, type InvitationListItem } from "@/lib/invitations";
import { listMembers } from "@/lib/members";
import { listMemberReputations } from "@/lib/reputation";

import { InvitationManager } from "../invitaciones/invitation-manager";
import { revokeInvitationAction } from "../invitaciones/actions";
import { MemberActiveForm } from "./member-forms";

export const metadata: Metadata = { title: "Miembros" };

const invitationStatusLabels = {
  available: "Disponible",
  used: "Utilizada",
  revoked: "Revocada",
  expired: "Vencida",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Mendoza",
  }).format(date);
}

function invitationStateLabel(invitation: InvitationListItem) {
  if (invitation.kind === "member" && invitation.status === "available") {
    const count = invitation.joined.length;
    if (count === 0) return "Vigente";
    if (count === 1) return "Vigente · 1 ingreso";
    return `Vigente · ${count} ingresos`;
  }
  return invitationStatusLabels[invitation.status];
}

export default async function MembersPage() {
  const admin = await requireAdmin();
  const [members, invitations, reputationList] = await Promise.all([
    listMembers(),
    listInvitations(),
    listMemberReputations(),
  ]);
  const reputations = Object.fromEntries(reputationList);
  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  const activeAdmins = members.filter((member) => member.role === "admin" && member.active).length;
  const inviters = members
    .filter((member) => member.active)
    .map((member) => ({ id: member.id, name: member.name, email: member.email }));

  return (
    <div className="adminPage shell">
      <div className="dashboardHeader">
        <div>
          <Link className="backLink" href="/club">
            ← Volver al club
          </Link>
          <p className="kicker">Panel administrativo</p>
          <h1>Miembros</h1>
          <p className="pageIntro">Sesión de {admin.name}</p>
          <AdminNav current="/admin/miembros" />
        </div>
        <SignOutButton />
      </div>

      <section className="invitationHistory">
        <div className="sectionHeading">
          <div>
            <p className="kicker">El club</p>
            <h2>Registrados</h2>
          </div>
          <span>{members.filter((member) => member.active).length} activos</span>
        </div>
        <p className="pageIntro">
          Acá están quienes entraron con Google y las personas que diste de alta desde la sala.
          Las fichas pendientes se vinculan al primer ingreso con el mismo mail.
        </p>

        {members.length === 0 ? (
          <p className="emptyList">Todavía no hay miembros cargados.</p>
        ) : (
          <div className="tableScroll">
            <table className="invitationTable">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Reputación</th>
                  <th>
                    <span className="srOnly">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const reputation = reputations[member.id];
                  const lastAdmin = member.role === "admin" && member.active && activeAdmins <= 1;
                  const inviterName = member.invitedByMemberId
                    ? memberNames.get(member.invitedByMemberId)
                    : undefined;
                  return (
                    <tr key={member.id}>
                      <td data-label="Nombre">
                        <strong>
                          {member.name}
                          {reputation?.founder ? <span className="founderTag">Founder</span> : null}
                        </strong>
                        <small>
                          {member.email}
                          {member.pendingFirstLogin ? " · Pendiente de primer ingreso" : ""}
                          {member.role === "admin" ? " · Admin" : ""}
                          {member.invitedByMemberId
                            ? ` · Invitado por ${inviterName ?? "un miembro"}`
                            : ""}
                          {reputation
                            ? reputation.nights > 0
                              ? ` · ${reputation.nights} funciones`
                              : " · Sin archivo"
                            : ""}
                        </small>
                      </td>
                      <td data-label="Estado">
                        <span className={`status ${member.active ? "status-available" : "status-revoked"}`}>
                          {member.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td data-label="Reputación">
                        {reputation ? <ReputationMark compact reputation={reputation} /> : "—"}
                      </td>
                      <td data-label="Acciones">
                        <div className="compactActions">
                          <Link className="smallButton" href={`/admin/miembros/${member.id}`}>
                            Ver
                          </Link>
                          <MemberActiveForm
                            active={member.active}
                            disabled={lastAdmin}
                            id={member.id}
                            lastAdmin={lastAdmin}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InvitationManager members={inviters} />

      <section className="invitationHistory">
        <div className="sectionHeading">
          <div>
            <p className="kicker">Últimos 100</p>
            <h2>Historial de enlaces</h2>
          </div>
          <span>{invitations.length} en total</span>
        </div>

        {invitations.length === 0 ? (
          <p className="emptyList">Todavía no generaste invitaciones.</p>
        ) : (
          <div className="tableScroll">
            <table className="invitationTable">
              <thead>
                <tr>
                  <th>Creada</th>
                  <th>Estado</th>
                  <th>Invita</th>
                  <th>Ingresaron</th>
                  <th>
                    <span className="srOnly">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td data-label="Creada">
                      {formatDate(invitation.createdAt)}
                      <small>Vence {formatDate(invitation.expiresAt)}</small>
                    </td>
                    <td data-label="Estado">
                      <span className={`status status-${invitation.status}`}>
                        {invitationStateLabel(invitation)}
                      </span>
                    </td>
                    <td data-label="Invita">
                      {invitation.kind === "member" ? (
                        invitation.inviter ? (
                          <Link className="inlineLink" href={`/admin/miembros/${invitation.inviter.id}`}>
                            {invitation.inviter.name}
                          </Link>
                        ) : (
                          "Miembro no encontrado"
                        )
                      ) : (
                        "Pase individual"
                      )}
                    </td>
                    <td data-label="Ingresaron">
                      {invitation.joined.length === 0 ? "—" : (
                        <div className="inviteJoinList">
                          {invitation.joined.map((person) => (
                            <div key={person.id}>
                              {person.email ? (
                                <Link className="inlineLink" href={`/admin/miembros/${person.id}`}>
                                  {person.name}
                                </Link>
                              ) : (
                                person.name
                              )}
                              {person.email ? <small>{person.email}</small> : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td data-label="Acciones">
                      {invitation.status === "available" ? (
                        <form action={revokeInvitationAction}>
                          <input name="id" type="hidden" value={invitation.id} />
                          <button className="dangerLink" type="submit">
                            Revocar
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
