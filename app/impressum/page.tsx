import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getMessages } from "@/lib/i18n";

const t = getMessages();
const im = t.impressum;

export const metadata: Metadata = {
  title: `${t.legal.impressumTitle} – ${t.comingSoon.brand}`,
  robots: { index: false, follow: false },
};

function Section({
  heading,
  lines,
}: {
  heading: string;
  lines: string[];
}) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white">{heading}</h2>
      <p className="mt-3 whitespace-pre-line">{lines.join("\n")}</p>
    </section>
  );
}

/** Impressum gemäß § 5 DDG (Texte in messages/de.json unter "impressum"). */
export default function ImpressumPage() {
  return (
    <LegalPageShell title={t.legal.impressumTitle}>
      <Section heading={im.anbieter.heading} lines={im.anbieter.lines} />
      <Section heading={im.vertretenDurch.heading} lines={im.vertretenDurch.lines} />
      <Section heading={im.kontakt.heading} lines={im.kontakt.lines} />
      <Section heading={im.handelsregister.heading} lines={im.handelsregister.lines} />
      <Section heading={im.ustId.heading} lines={im.ustId.lines} />
      <Section heading={im.steuernummer.heading} lines={im.steuernummer.lines} />

      {/*
        Optionale Pflichtblöcke — einkommentieren, sobald zutreffend:
        - Aufsichtsbehörde: nur bei erlaubnispflichtiger Tätigkeit
        - MStV: nur bei journalistisch-redaktionellen Inhalten (§ 18 Abs. 2 MStV)
        Die Texte liegen bereits in messages/de.json unter impressum.optional.

      <Section
        heading={im.optional.aufsichtsbehoerde.heading}
        lines={im.optional.aufsichtsbehoerde.lines}
      />
      <Section heading={im.optional.mstv.heading} lines={im.optional.mstv.lines} />
      */}

      <section>
        <h2 className="text-lg font-bold text-white">
          {im.streitschlichtung.heading}
        </h2>
        <p className="mt-3">{im.streitschlichtung.odrNote}</p>
        <p className="mt-3">{im.streitschlichtung.verbraucherschlichtung}</p>
      </section>
    </LegalPageShell>
  );
}
