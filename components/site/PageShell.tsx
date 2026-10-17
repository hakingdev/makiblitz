import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HomeFooter } from "@/components/site/HomeFooter";

export function PageShell({
  children,
  footer = "site",
}: {
  children: ReactNode;
  /** The Startseite keeps its larger brand footer; every other page the compact one. */
  footer?: "home" | "site";
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {footer === "home" ? <HomeFooter /> : <SiteFooter />}
    </div>
  );
}
