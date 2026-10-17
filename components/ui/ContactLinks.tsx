import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { MAPS_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const t = getMessages();

const linkBase = "focus-ring rounded underline-offset-4 transition-colors hover:underline";

/** Address → Google Maps route planner (new tab / Maps app). */
export function MapsLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <a
      href={MAPS_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={t.contact.mapsTitle}
      className={cn(linkBase, className)}
    >
      {children}
    </a>
  );
}

export function PhoneLink({ className }: { className?: string }) {
  return (
    <a href={`tel:${t.contact.phoneHref}`} className={cn(linkBase, className)}>
      {t.contact.phone}
    </a>
  );
}

const TOKENS = [t.contact.phone, t.contact.email, `${t.contact.street}, ${t.contact.city}`];
const SPLIT = new RegExp(`(${TOKENS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);

/** Plain text with the restaurant's phone, e-mail and address turned into links. */
export function Linkified({ text, linkClassName }: { text: string; linkClassName?: string }) {
  return (
    <>
      {text.split(SPLIT).map((part, i) => {
        if (part === t.contact.phone) return <PhoneLink key={i} className={linkClassName} />;
        if (part === t.contact.email)
          return (
            <a key={i} href={`mailto:${part}`} className={cn(linkBase, linkClassName)}>
              {part}
            </a>
          );
        if (part === TOKENS[2]) return <MapsLink key={i} className={linkClassName}>{part}</MapsLink>;
        return part;
      })}
    </>
  );
}
