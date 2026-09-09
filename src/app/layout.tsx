import type { Metadata } from "next";
import { Archivo } from "next/font/google";

import { Brand } from "@/components/brand";
import { GoogleAuthReturn } from "@/components/google-auth-return";
import { SiteMenu } from "@/components/site-menu";
import { getCurrentMember } from "@/lib/authz";
import { getLandingVisual } from "@/lib/landing";
import { menuLinksFor } from "@/lib/nav";

import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pochoclo.club"),
  title: {
    default: "Pochoclo Club",
    template: "%s · Pochoclo Club",
  },
  description: "Reservas privadas para las funciones de Pochoclo Club.",
  applicationName: "Pochoclo Club",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Pochoclo Club",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [member, visual] = await Promise.all([getCurrentMember(), getLandingVisual()]);

  return (
    <html lang="es">
      <body className={archivo.className}>
        <GoogleAuthReturn />
        <header className="siteHeader">
          <SiteMenu links={menuLinksFor(member)} visual={visual} />
          <Brand />
          <span className="eyebrow">Mendoza</span>
        </header>
        <main>{children}</main>
        <footer className="siteFooter">
          <span>Pochoclo Club · Comunidad</span>
          <img
            alt=""
            className="footerMark"
            height={56}
            src="/brand/pochoclo-oso.png"
            width={56}
          />
          <span>Una función, catorce lugares.</span>
        </footer>
      </body>
    </html>
  );
}
