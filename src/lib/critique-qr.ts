import "server-only";

import QRCode from "qrcode";

export async function critiqueQrSvg(url: string) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#f4f1ea", light: "#00000000" },
  });
}

export async function ticketQrSvg(url: string) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#111111", light: "#f4f1ea" },
  });
}
