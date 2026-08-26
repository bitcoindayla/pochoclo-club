import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/session-actions";
import { sumMemberAttendance } from "@/lib/attendance-policy";
import { requireAdmin } from "@/lib/authz";
import { listFilmHistory } from "@/lib/critiques";
import { listInvitations } from "@/lib/invitations";
import { listMembers } from "@/lib/members";

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

export default async function MembersPage() {
  const admin = await requireAdmin();
  const [members, invitations, history] = await Promise.all([
    listMembers(),
    listInvitations(),
    listFilmHistory(),
  ]);
  const activeAdmins = members.filter((member) => member.role === "admin" && member.active).length;

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
          Acá están quienes ya entraron con Google. Los +1 viven en cada función, a cargo de quien
          los trajo. Cuando acepten una invitación, aparecen en esta lista.
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
                  <th>Asistencia</th>
                  <th>
                    <span className="srOnly">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const nights = sumMemberAttendance(history, member.id);
                  const lastAdmin = member.role === "admin" && member.active && activeAdmins <= 1;
                  return (
                    <tr key={member.id}>
                      <td data-label="Nombre">
                        <strong>{member.name}</strong>
                        <small>
                          {member.email}
                          {member.role === "admin" ? " · Admin" : ""}
                        </small>
                      </td>
                      <td data-label="Estado">
                        <span className={`status ${member.active ? "status-available" : "status-revoked"}`}>
                          {member.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td data-label="Asistencia">
                        {nights.present + nights.absent > 0 ? (
                          <>
                            {nights.present} presente{nights.present === 1 ? "" : "s"}
                            <small>
                              {nights.absent} ausente{nights.absent === 1 ? "" : "s"}
                            </small>
                          </>
                        ) : (
                          <span className="mutedText">—</span>
                        )}
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

      <InvitationManager />

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
                  <th>Miembro</th>
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
                        {invitationStatusLabels[invitation.status]}
                      </span>
                    </td>
                    <td data-label="Miembro">
                      {invitation.usedBy ? (
                        <>
                          {invitation.usedBy.name}
                          <small>{invitation.usedBy.email}</small>
                        </>
                      ) : (
                        "—"
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
