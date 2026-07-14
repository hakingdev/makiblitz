import type { Metadata, Viewport } from "next";
import { Mulish, Rock_Salt } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart/CartContext";
import { ConsentProvider } from "@/lib/consent";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { FacebookPixel } from "@/components/analytics/FacebookPixel";

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
  metadataBase: new URL("https://makiblitz.de"),
  title: "MakiLove — Fresh Sushi Delivery",
  description:
    "Authentic sushi made by master chefs. Quick delivery or easy pickup across the city.",
  keywords: ["sushi", "delivery", "sashimi", "maki", "nigiri", "Lieferung"],
};

export const viewport: Viewport = {
  themeColor: "#16171A",
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
        <CartProvider>
          <ConsentProvider>
            {children}
            <ConsentBanner />
            <FacebookPixel />
          </ConsentProvider>
        </CartProvider>
      </body>
    </html>
  );
}
