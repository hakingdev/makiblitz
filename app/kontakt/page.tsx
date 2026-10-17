import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { ContactForm } from "@/components/contact/ContactForm";
import { getMessages } from "@/lib/i18n";

const t = getMessages();
const c = t.contactPage;

export const metadata: Metadata = {
  title: c.metaTitle,
  description: c.body,
};

const label = "text-[11px] font-bold leading-4 text-muted";

/** Kontakt (Figma 15:1058 mobile · 15:541 desktop) — details left, message form right. */
export default function KontaktPage() {
  return (
    <PageShell>
      <div className="page-container flex flex-col gap-8 pb-12 pt-8 lg:flex-row lg:items-start lg:gap-20 lg:pb-16 lg:pt-14">
        <div className="flex flex-col items-start gap-6 lg:max-w-[520px] lg:flex-1">
          <p className="text-[11px] font-bold leading-4 text-brand">{c.eyebrow}</p>
          <h1 className="text-[38px] font-extrabold leading-[45px] md:text-[48px] md:leading-[56px] lg:text-[clamp(48px,4.2vw,60px)] lg:leading-[1.133]">
            {c.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="text-base leading-[27px] text-muted lg:max-w-[480px]">{c.body}</p>

          <a href={`tel:${t.contact.phoneHref}`} className="focus-ring group flex flex-col gap-2 rounded">
            <span className={label}>{c.phoneLabel}</span>
            <span className="text-[32px] font-extrabold leading-[46px] text-brand transition-colors group-hover:text-brand-dark lg:text-[42px] lg:leading-[61px]">
              {t.contact.phone}
            </span>
          </a>

          <div className="flex flex-col gap-2">
            <p className={label}>{c.addressLabel}</p>
            <address className="text-lg font-bold not-italic leading-7 text-ink">
              {t.contact.street}
              <br />
              {t.contact.city}
            </address>
          </div>

          <a
            href={`mailto:${t.contact.email}`}
            className="focus-ring rounded text-base font-semibold leading-[23px] text-ink hover:text-brand"
          >
            {t.contact.email}
          </a>
        </div>

        <section
          aria-labelledby="contact-form-title"
          className="flex flex-col gap-6 lg:max-w-[680px] lg:flex-1 lg:rounded-3xl lg:border lg:border-line lg:bg-white lg:p-8"
        >
          <h2
            id="contact-form-title"
            className="text-2xl font-extrabold leading-[33px] lg:text-[28px] lg:leading-[38px]"
          >
            {c.formTitle}
          </h2>
          <ContactForm />
        </section>
      </div>
    </PageShell>
  );
}
