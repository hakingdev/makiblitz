import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { INSTAGRAM_URL } from "@/lib/site";
import { CookieSettingsButton } from "@/components/consent/CookieSettingsButton";
import { Wordmark } from "@/components/ui/Wordmark";
import { MapsLink } from "@/components/ui/ContactLinks";

const t = getMessages();

const legalLink = "focus-ring rounded transition-colors hover:text-ink";

/** Startseite "07 / Footer" — brand & contact, divider, legal row. */
export function HomeFooter() {
  return (
    <footer className="bg-paper">
      <div className="page-container flex flex-col gap-6 py-8 lg:py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <Wordmark />
          <address className="text-[13px] not-italic leading-[19px] text-muted lg:w-[650px] lg:text-[15px] lg:leading-[22px]">
            <MapsLink className="block hover:text-ink lg:inline">
              <span className="block lg:inline">{t.contact.street}</span>
              <span className="hidden lg:inline">, </span>
              <span className="block lg:inline">{t.contact.city}</span>
            </MapsLink>
            <span className="hidden lg:inline"> · </span>
            <a href={`mailto:${t.contact.email}`} className={`${legalLink} block lg:inline`}>
              {t.contact.email}
            </a>
          </address>
        </div>

        <div className="h-px bg-line" />

        <div className="flex flex-col gap-3 text-xs leading-[17px] text-muted lg:flex-row lg:justify-between">
          <p>{t.footer.tagline}</p>
          <nav aria-label="Rechtliches" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/impressum" className={legalLink}>
              {t.footer.impressum}
            </Link>
            <Link href="/datenschutz" className={legalLink}>
              {t.footer.datenschutz}
            </Link>
            {INSTAGRAM_URL && (
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={legalLink}>
                {t.footer.instagramLabel}
              </a>
            )}
            <CookieSettingsButton className={legalLink} />
          </nav>
        </div>
      </div>
    </footer>
  );
}
