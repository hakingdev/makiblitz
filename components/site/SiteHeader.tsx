"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";

const t = getMessages();

const NAV = [
  { href: "/speisekarte", label: t.nav.menu },
  { href: "/restaurant", label: t.nav.restaurant },
  { href: "#kontakt", label: t.nav.contact },
];

/**
 * 01 / Header — mobile: wordmark + menu icon (opens a full-screen panel);
 * desktop (lg): wordmark, navigation, reservation CTA.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-paper">
      <div className="page-container flex items-center justify-between gap-6 py-4 lg:py-6">
        <Wordmark />

        <nav
          aria-label="Hauptnavigation"
          className="hidden items-center gap-8 text-[15px] font-semibold leading-[22px] lg:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="focus-ring rounded transition-colors hover:text-brand aria-[current=page]:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <ButtonLink href="/reservieren" className="hidden w-[220px] lg:inline-flex">
          {t.nav.reserve}
        </ButtonLink>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          className="focus-ring -mr-2.5 grid size-11 place-items-center rounded-full lg:hidden"
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-20 overflow-y-auto bg-paper lg:hidden"
      >
        <nav aria-label="Hauptnavigation" className="page-container flex flex-col pb-10 pt-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "focus-ring border-b border-line py-4 text-2xl font-extrabold leading-8",
                pathname === item.href && "text-brand",
              )}
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink href="/reservieren" className="mt-8 w-full">
            {t.nav.reserve}
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
