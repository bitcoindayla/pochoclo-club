import type { Metadata } from "next";

import { Brand } from "@/components/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pochoclo Club",
    template: "%s · Pochoclo Club",
  },
  description: "Reservas privadas para las funciones de Pochoclo Club.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <header className="siteHeader">
          <Brand />
          <span className="eyebrow">Mendoza · Rebobinar antes de devolver</span>
        </header>
        <main>{children}</main>
        <footer className="siteFooter">
          <span>Pochoclo Club</span>
          <span>Una función · Catorce lugares · Be kind, rewind.</span>
        </footer>
      </body>
    </html>
  );
}
