"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";

const t = getMessages();

const NAV = [
  { href: "/", label: t.nav.start },
  { href: "/galerie", label: t.nav.gallery },
  { href: "/speisekarte", label: t.nav.menu },
  { href: "/reservieren", label: t.nav.reserve, highlight: true },
  { href: "/kontakt", label: t.nav.contact },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Site / Header — desktop (lg): wordmark + navigation, the current page in
 * bold red. Mobile: wordmark + menu icon opening "Mobile · Navigation" as a
 * full-screen panel.
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

        <nav aria-label="Hauptnavigation" className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring rounded py-2 text-[15px] leading-[22px] transition-colors",
                  active ? "font-bold text-brand" : "font-semibold text-ink hover:text-brand",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={t.nav.openMenu}
          className="focus-ring -mr-2.5 grid size-11 place-items-center rounded-full lg:hidden"
        >
          <Icon name="menu" />
        </button>
      </div>

      <div
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.openMenu}
        hidden={!open}
        className="fixed inset-0 z-50 overflow-y-auto bg-paper lg:hidden"
      >
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-6">
            <Wordmark />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.nav.closeMenu}
              className="focus-ring -mr-2.5 -mt-1 grid size-11 place-items-center rounded-full"
            >
              <Icon name="close-24" />
            </button>
          </div>

          <nav aria-label="Hauptnavigation" className="flex flex-col gap-6">
            {NAV.map((item) => (
              <div key={item.href} className="flex flex-col gap-6">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={cn(
                    "focus-ring flex items-start justify-between gap-4 rounded py-4 text-2xl font-extrabold leading-[35px]",
                    item.highlight ? "text-brand" : "text-ink",
                  )}
                >
                  {item.label}
                  <Icon name={item.highlight ? "arrow-link" : "arrow-ink"} />
                </Link>
                <div className="h-px bg-line" />
              </div>
            ))}
          </nav>

          <p className="text-sm leading-[25px] text-muted">
            <a href={`tel:${t.contact.phoneHref}`} className="focus-ring block w-fit rounded hover:text-ink">
              {t.contact.phone}
            </a>
            {t.contact.street}, {t.contact.city}
          </p>
        </div>
      </div>
    </header>
  );
}
