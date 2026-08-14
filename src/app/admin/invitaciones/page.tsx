import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/session-actions";
import { requireAdmin } from "@/lib/authz";
import { listInvitations } from "@/lib/invitations";

import { revokeInvitationAction } from "./actions";
import { InvitationManager } from "./invitation-manager";

export const metadata: Metadata = { title: "Invitaciones" };

const statusLabels = {
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

export default async function InvitationsPage() {
  const admin = await requireAdmin();
  const invitations = await listInvitations();

  return (
    <div className="adminPage shell">
      <div className="dashboardHeader">
        <div>
          <Link className="backLink" href="/club">← Volver al club</Link>
          <p className="kicker">Panel administrativo</p>
          <h1>Invitaciones</h1>
          <p className="pageIntro">Sesión de {admin.name}</p>
          <AdminNav current="/admin/invitaciones" />
        </div>
        <SignOutButton />
      </div>

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
                  <th><span className="srOnly">Acciones</span></th>
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
                        {statusLabels[invitation.status]}
                      </span>
                    </td>
                    <td data-label="Miembro">
                      {invitation.usedBy ? (
                        <>
                          {invitation.usedBy.name}
                          <small>{invitation.usedBy.email}</small>
                        </>
                      ) : "—"}
                    </td>
                    <td data-label="Acciones">
                      {invitation.status === "available" ? (
                        <form action={revokeInvitationAction}>
                          <input name="id" type="hidden" value={invitation.id} />
                          <button className="dangerLink" type="submit">Revocar</button>
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
