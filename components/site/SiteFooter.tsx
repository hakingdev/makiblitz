import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { CookieSettingsButton } from "@/components/consent/CookieSettingsButton";
import { MapsLink } from "@/components/ui/ContactLinks";

const t = getMessages();

const link = "focus-ring rounded transition-colors hover:text-ink";

/** Site / Footer — compact footer of Galerie, Speisekarte, Kontakt and the text pages. */
export function SiteFooter() {
  return (
    <footer className="bg-paper">
      <div className="page-container flex flex-col items-start gap-4 py-8">
        <div className="h-px w-full bg-line" />
        <p className="text-xs leading-[22px] text-muted lg:text-sm">
          <MapsLink className="hover:text-ink">{t.footer.address}</MapsLink>
        </p>
        <p className="text-xs font-semibold leading-[17px] text-ink lg:text-sm lg:leading-5">
          <a href={`tel:${t.contact.phoneHref}`} className={link}>
            {t.contact.phone}
          </a>
          {" · "}
          <a href={`mailto:${t.contact.email}`} className={link}>
            {t.contact.email}
          </a>
        </p>
        <nav
          aria-label="Rechtliches"
          className="flex flex-col items-start gap-1 text-[11px] leading-4 text-muted sm:flex-row sm:items-center sm:gap-3"
        >
          <span className="flex items-center gap-3">
            <span>{t.footer.copyright}</span>
            <span aria-hidden="true">·</span>
            <Link href="/impressum" className={link}>
              {t.footer.impressum}
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/datenschutz" className={link}>
              {t.footer.datenschutz}
            </Link>
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <CookieSettingsButton className={link} />
        </nav>
      </div>
    </footer>
  );
}
