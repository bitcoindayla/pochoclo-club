import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Acceso privado" };

const reasonMessages: Record<string, string> = {
  "invalid-invitation": "El enlace de invitación no es válido.",
  "used-invitation": "La invitación ya fue utilizada.",
  "revoked-invitation": "La invitación fue revocada.",
  "expired-invitation": "La invitación venció. Pedile una nueva a un administrador.",
  "invitation-required": "Esta cuenta todavía no es miembro. Para darte de alta necesitás una invitación vigente.",
  "inactive-member": "Esta membresía está desactivada.",
  "account-conflict": "Esta cuenta de Google no coincide con la membresía registrada.",
  "unverified-account": "Google no confirmó el correo de esta cuenta.",
  "invalid-request": "La solicitud de acceso venció. Volvé al inicio e intentá otra vez.",
  "session-error": "Firebase no pudo completar la sesión. Intentá nuevamente.",
};

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="centeredPage shell narrowShell">
      <section className="messageCard">
        <span className="largeIndex">NO.</span>
        <p className="kicker">Acceso privado</p>
        <h1>No pudimos dejarte entrar.</h1>
        <p>
          {reason && reasonMessages[reason]
            ? reasonMessages[reason]
            : "Esta cuenta todavía no es miembro de Pochoclo Club. Para darte de alta necesitás una invitación vigente."}
        </p>
        <Link className="primaryButton" href="/">
          Volver al inicio
        </Link>
      </section>
    </div>
  );
}
