/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import sharp from "sharp";

import type { InvitationStatus } from "@/lib/invitation-policy";
import {
  INVITE_TICKET_FIELDS,
  INVITE_TICKET_HEIGHT,
  INVITE_TICKET_WIDTH,
} from "@/lib/invitation-ticket-policy";

const INK = "#1a1208";
const INK_SOFT = "rgba(26, 18, 8, 0.58)";
const GOLD = "#e8c36a";
const GOLD_DEEP = "#c9962e";
const CREAM = "#f4f1ea";
const WELL = "#0b0b0b";

const STATUS_STAMP: Record<Exclude<InvitationStatus, "available">, string> = {
  used: "Utilizado",
  expired: "Vencido",
  revoked: "Revocado",
};

export type InvitationTicketView = {
  serial: string;
  expiresLabel: string;
  status: InvitationStatus;
  bear: Buffer;
  qr: Buffer;
};

export async function loadInvitationTicketAssets(inviteUrl: string) {
  const [bearSource, qr] = await Promise.all([
    readFile(join(process.cwd(), "public/brand/pochoclo-oso.png")),
    QRCode.toBuffer(inviteUrl, {
      type: "png",
      width: 336,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: INK, light: CREAM },
    }),
  ]);
  const bear = await sharp(bearSource)
    .resize(360, 354, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return { bear, qr };
}

export function invitationTicketImage(view: InvitationTicketView) {
  return new ImageResponse(<GoldenTicket {...view} />, {
    width: INVITE_TICKET_WIDTH,
    height: INVITE_TICKET_HEIGHT,
    headers: {
      "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
      "Content-Disposition": `inline; filename="pochoclo-${view.serial}.png"`,
      "Content-Type": "image/png",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function GoldenTicket({
  serial,
  expiresLabel,
  status,
  bear,
  qr,
}: InvitationTicketView) {
  const stamp = status === "available" ? null : STATUS_STAMP[status];
  const bearSrc = dataUri(bear);
  const qrSrc = dataUri(qr);

  return (
    <div
      style={{
        width: INVITE_TICKET_WIDTH,
        height: INVITE_TICKET_HEIGHT,
        display: "flex",
        background: WELL,
        padding: 28,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(180deg, #f3d78a 0%, ${GOLD} 38%, ${GOLD_DEEP} 100%)`,
          border: `3px solid ${INK}`,
          boxShadow: `inset 0 0 0 7px ${GOLD}, inset 0 0 0 9px ${INK}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flex: 1, position: "relative" }}>
          <Sprockets />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "28px 18px 22px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 188,
                  height: 188,
                  borderRadius: 94,
                  background: WELL,
                  border: `3px solid ${INK}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 10px 24px rgba(26,18,8,0.28)",
                }}
              >
                <img alt="" height={176} src={bearSrc} width={179} />
              </div>
              <div
                style={{
                  marginTop: 16,
                  color: INK,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 7,
                  textTransform: "uppercase",
                }}
              >
                Golden Ticket
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: INK,
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Pochoclo Club
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: INK_SOFT,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                Mendoza · Sala privada
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                background: INK,
                color: GOLD,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 8,
                textTransform: "uppercase",
              }}
            >
              {INVITE_TICKET_FIELDS.admit}
            </div>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  color: INK,
                  fontSize: 42,
                  fontWeight: 800,
                  letterSpacing: -1.5,
                  lineHeight: 0.92,
                  textAlign: "center",
                  textTransform: "uppercase",
                }}
              >
                Hay un lugar
              </div>
              <div
                style={{
                  color: INK,
                  fontSize: 42,
                  fontWeight: 800,
                  letterSpacing: -1.5,
                  lineHeight: 0.92,
                  textAlign: "center",
                  textTransform: "uppercase",
                }}
              >
                para vos
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                display: "flex",
                flexDirection: "column",
                borderTop: `1px solid ${INK}`,
              }}
            >
              <FactRow
                left={{ label: "Sala", value: INVITE_TICKET_FIELDS.sala }}
                right={{ label: "Ciudad", value: INVITE_TICKET_FIELDS.ciudad }}
              />
              <FactRow
                left={{ label: "Función", value: INVITE_TICKET_FIELDS.funcion }}
                right={{ label: "Butaca", value: INVITE_TICKET_FIELDS.butaca }}
              />
              <FactRow
                left={{ label: "Válido", value: expiresLabel }}
                right={{ label: "Pase", value: INVITE_TICKET_FIELDS.admit }}
                last
              />
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: INK,
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 3,
              }}
            >
              <div style={{ display: "flex" }}>Nº {serial}</div>
              <div style={{ display: "flex", fontSize: 12, letterSpacing: 2 }}>
                {INVITE_TICKET_FIELDS.footer}
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: WELL,
                  marginLeft: -27,
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: 0,
                  borderTop: `2px dashed ${INK}`,
                  marginLeft: 8,
                  marginRight: 8,
                }}
              />
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: WELL,
                  marginRight: -27,
                }}
              />
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 168,
                  height: 168,
                  background: CREAM,
                  padding: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${INK}`,
                }}
              >
                <img alt="" height={152} src={qrSrc} width={152} />
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  paddingLeft: 16,
                }}
              >
                <div
                  style={{
                    color: INK,
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: -0.4,
                    lineHeight: 1.15,
                  }}
                >
                  Mostrá este pase al llegar.
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: INK_SOFT,
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.35,
                  }}
                >
                  Escaneá el QR o abrí el enlace. Entrá con Google; es de una sola vez.
                </div>
                <div
                  style={{
                    marginTop: 12,
                    color: INK,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  No transferible
                </div>
              </div>
            </div>
          </div>
          <Sprockets />
        </div>

        {stamp ? (
          <div
            style={{
              position: "absolute",
              top: 430,
              left: 150,
              display: "flex",
              padding: "10px 22px",
              border: `4px solid ${INK}`,
              color: INK,
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 6,
              textTransform: "uppercase",
              transform: "rotate(-18deg)",
              background: "rgba(232, 195, 106, 0.72)",
            }}
          >
            {stamp}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FactRow({
  left,
  right,
  last = false,
}: {
  left: { label: string; value: string };
  right: { label: string; value: string };
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        borderBottom: last ? "1px solid transparent" : `1px solid ${INK}`,
      }}
    >
      <Fact label={left.label} value={left.value} />
      <Fact label={right.label} value={right.value} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "12px 12px 12px 0",
      }}
    >
      <div
        style={{
          color: INK_SOFT,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 2.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          color: INK,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: -0.4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Sprockets() {
  return (
    <div
      style={{
        width: 28,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 0",
        background: "rgba(26, 18, 8, 0.08)",
      }}
    >
      {Array.from({ length: 18 }, (_, index) => (
        <div
          key={index}
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: WELL,
            border: `1px solid ${INK}`,
          }}
        />
      ))}
    </div>
  );
}

function dataUri(bytes: Buffer) {
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
