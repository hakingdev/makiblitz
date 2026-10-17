import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CookieSettingsButton } from "@/components/consent/CookieSettingsButton";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";

const t = getMessages();
const r = t.reservation;

/** Reservation / Header — wordmark + close (icon only on mobile). */
export function ReservationHeader() {
  return (
    <header className="page-container flex items-center justify-between gap-4 py-4 lg:py-6">
      <Wordmark />
      <Link
        href="/"
        aria-label={t.nav.home}
        className="focus-ring -mr-2.5 flex h-11 items-center gap-2 rounded-full px-2.5 text-sm font-semibold leading-5 text-muted transition-colors hover:text-ink"
      >
        <span className="hidden md:inline">{t.nav.home}</span>
        <Icon name="close" />
      </Link>
    </header>
  );
}

const footerLink = "focus-ring rounded transition-colors hover:text-ink";

/** Reservation / Footer — © left, legal links right. */
export function ReservationFooter() {
  return (
    <footer className="page-container flex items-start justify-between gap-2 py-6 text-[11px] leading-4 text-muted">
      <p>{t.footer.copyright}</p>
      <nav aria-label="Rechtliches" className="flex flex-wrap justify-end gap-x-1">
        <Link href="/datenschutz" className={footerLink}>
          {t.footer.datenschutz}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/impressum" className={footerLink}>
          {t.footer.impressum}
        </Link>
        <span aria-hidden="true">·</span>
        <CookieSettingsButton className={footerLink} />
      </nav>
    </footer>
  );
}

/** Reservation / Progress — step 1 "Dein Besuch", step 2 "Deine Daten". */
export function Progress({ step }: { step: 1 | 2 }) {
  return (
    <ol className="flex items-center gap-4 lg:gap-8">
      {r.steps.map((label, i) => {
        const index = i + 1;
        const done = index < step;
        const active = index === step;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-xs font-bold leading-[17px]",
                done || active ? "bg-brand text-white" : "bg-line text-muted",
              )}
            >
              {done ? "✓" : index}
            </span>
            <span
              className={cn(
                "text-xs font-bold leading-[17px] lg:text-sm lg:leading-5",
                active ? "text-brand" : "text-muted",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Reservation / Introduction — progress, headline, copy; on desktop also the
 * food photo and the Rock Salt line.
 */
export function StepIntro({
  step,
  title,
  body,
  photoAspectClass,
}: {
  step: 1 | 2;
  title: string[];
  body: string;
  photoAspectClass: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:max-w-[520px] lg:flex-1 lg:gap-6">
      <Progress step={step} />
      <h1 className="text-[34px] font-extrabold leading-[41px] md:text-[44px] md:leading-[52px] lg:text-[clamp(40px,3.9vw,56px)] lg:leading-[1.143]">
        {title.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>
      <p className="text-base leading-[26px] text-muted lg:max-w-[440px]">{body}</p>
      <div
        className={cn(
          "relative hidden w-full max-w-[440px] overflow-hidden rounded-3xl bg-paper lg:block",
          photoAspectClass,
        )}
      >
        <Image
          src="/images/rolle-07.png"
          alt={r.asidePhotoAlt}
          fill
          sizes="440px"
          className="object-cover"
        />
      </div>
      <p className="hidden font-script text-xl leading-[38px] text-brand lg:block">{r.aside}</p>
    </div>
  );
}

/** Intro column + form column (stacked on mobile). */
export function StepLayout({ intro, children }: { intro: ReactNode; children: ReactNode }) {
  return (
    <div className="page-container flex flex-col gap-8 pb-8 pt-6 lg:flex-row lg:items-start lg:gap-20 lg:pb-16 lg:pt-12">
      {intro}
      <div className="lg:max-w-[680px] lg:flex-1 lg:rounded-3xl lg:border lg:border-line lg:bg-white lg:p-8">
        {children}
      </div>
    </div>
  );
}

export const formTitle =
  "text-2xl font-extrabold leading-[35px] lg:text-[28px] lg:leading-[41px]";
