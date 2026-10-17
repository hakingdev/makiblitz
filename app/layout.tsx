import type { Metadata, Viewport } from "next";
import { Mulish, Rock_Salt } from "next/font/google";
import "./globals.css";
import { ConsentProvider } from "@/lib/consent";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { FacebookPixel } from "@/components/analytics/FacebookPixel";
import { getMessages } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

const t = getMessages();

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-mulish",
  display: "swap",
});

const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rock-salt",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: t.meta.title,
    template: `%s – ${t.brand.name}`,
  },
  description: t.meta.description,
  keywords: ["Sushi", "Restaurant", "Bad Kissingen", "Tisch reservieren", "Maki", "Nigiri", "Sashimi"],
  openGraph: {
    title: t.meta.ogTitle,
    description: t.meta.ogDescription,
    locale: "de_DE",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFCF8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${mulish.variable} ${rockSalt.variable}`}>
      <body>
        <ConsentProvider>
          {children}
          <ConsentBanner />
          <FacebookPixel />
        </ConsentProvider>
      </body>
    </html>
  );
}
