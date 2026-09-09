import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/session-actions";
import { catalogForMember, sumMemberAttendance } from "@/lib/attendance-policy";
import { requireAdmin } from "@/lib/authz";
import { listFilmHistory } from "@/lib/critiques";
import { getMemberById, listMembers } from "@/lib/members";
import { isFounderEmail } from "@/lib/reputation-policy";
import { CLUB_TIME_ZONE } from "@/lib/screening-policy";

import { AttendanceToggle, MemberActiveForm, MemberNameForm } from "../member-forms";

export const metadata: Metadata = { title: "Miembro" };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: CLUB_TIME_ZONE,
  }).format(date);
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [member, members, history] = await Promise.all([
    getMemberById(id),
    listMembers(),
    listFilmHistory(),
  ]);
  if (!member) notFound();

  const nights = catalogForMember(history, member.id);
  const counts = sumMemberAttendance(history, member.id);
  const lastAdmin =
    member.role === "admin" &&
    member.active &&
    members.filter((row) => row.role === "admin" && row.active).length <= 1;

  return (
    <div className="adminPage shell">
      <div className="dashboardHeader">
        <div>
          <Link className="backLink" href="/admin/miembros">
            ← Volver a miembros
          </Link>
          <p className="kicker">Panel administrativo</p>
          <h1>
            {member.name}
            {isFounderEmail(member.email) ? <span className="founderTag">Founder</span> : null}
          </h1>
          <p className="pageIntro">
            {member.email}
            {member.role === "admin" ? " · Administrador" : ""}
          </p>
          <AdminNav current="/admin/miembros" />
        </div>
        <SignOutButton />
      </div>

      <section className="screeningCreator">
        <div>
          <p className="kicker">Ficha</p>
          <h2>Datos del club</h2>
          <p>El nombre se usa en la sala, la crítica y el historial. No se pisa al volver a entrar con Google.</p>
        </div>
        <div className="memberFicha">
          <MemberNameForm id={member.id} name={member.name} />
          <div>
            <p className="kicker">Estado</p>
            <span className={`status ${member.active ? "status-available" : "status-revoked"}`}>
              {member.active ? "Activo" : "Inactivo"}
            </span>
            <MemberActiveForm
              active={member.active}
              disabled={lastAdmin}
              id={member.id}
              lastAdmin={lastAdmin}
            />
          </div>
        </div>
      </section>

      <section className="invitationHistory">
        <div className="sectionHeading">
          <div>
            <p className="kicker">Funciones</p>
            <h2>Asistencia</h2>
          </div>
          <span>
            {counts.present} presente{counts.present === 1 ? "" : "s"} · {counts.absent} ausente
            {counts.absent === 1 ? "" : "s"}
          </span>
        </div>
        <p className="pageIntro">
          Marcá presente en cada película que esta persona vio. Las que no toques quedan sin
          archivo. Desde la próxima, al cerrar la crítica: ocupó lugar y puntuó, presente;
          reservó y no puntuó, ausente. Sesión de {admin.name}.
        </p>

        {history.length === 0 ? (
          <p className="emptyList">Todavía no hay películas en el historial.</p>
        ) : (
          <div className="tableScroll">
            <table className="invitationTable">
              <thead>
                <tr>
                  <th>Función</th>
                  <th>Quién</th>
                  <th>Estado</th>
                  <th>
                    <span className="srOnly">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {nights.flatMap((night) => {
                  const rows = [
                    {
                      personId: night.own?.personId ?? member.id,
                      label: night.own?.name ?? member.name,
                      status: night.own?.status ?? null,
                      average: night.own?.average ?? null,
                    },
                    ...night.guests.map((guest) => ({
                      personId: guest.personId,
                      label: `+1 ${guest.name}`,
                      status: guest.status,
                      average: guest.average,
                    })),
                  ];
                  return rows.map((row, index) => (
                    <tr key={`${night.filmId}-${row.personId}`}>
                      <td data-label="Función">
                        {index === 0 ? (
                          <>
                            <strong>{night.title}</strong>
                            <small>
                              {formatDate(night.watchedAt)} · {night.year}
                            </small>
                          </>
                        ) : (
                          <span className="mutedText">↳ invitado</span>
                        )}
                      </td>
                      <td data-label="Quién">{row.label}</td>
                      <td data-label="Estado">
                        <span
                          className={`status ${
                            row.status === "presente"
                              ? "status-available"
                              : row.status === "ausente"
                                ? "status-revoked"
                                : ""
                          }`}
                        >
                          {row.status ?? "sin marcar"}
                        </span>
                        {row.average != null ? (
                          <small>{row.average.toFixed(1)}</small>
                        ) : null}
                      </td>
                      <td data-label="Acciones">
                        <AttendanceToggle
                          filmId={night.filmId}
                          memberId={member.id}
                          personId={row.personId}
                          status={row.status}
                        />
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
