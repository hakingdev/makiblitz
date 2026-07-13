import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getMessages } from "@/lib/i18n";

const t = getMessages();
const ds = t.datenschutz;

export const metadata: Metadata = {
  title: `${t.legal.datenschutzTitle} – ${t.comingSoon.brand}`,
  robots: { index: false, follow: false },
};

/**
 * Datenschutzerklärung nach Art. 13 DSGVO. Struktur und Pflichtabschnitte
 * sind vollständig; alle [TODO: …]-Angaben (Firmendaten, Provider,
 * Aufsichtsbehörde, Datum) vor dem Launch ersetzen — Texte in
 * messages/de.json unter "datenschutz".
 */
export default function DatenschutzPage() {
  return (
    <LegalPageShell title={t.legal.datenschutzTitle}>
      <p>{ds.intro}</p>

      {ds.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-lg font-bold text-white">{section.heading}</h2>
          {section.intro.map((paragraph) => (
            <p key={paragraph} className="mt-3 whitespace-pre-line">
              {paragraph}
            </p>
          ))}
          {section.list.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {section.outro.map((paragraph) => (
            <p key={paragraph} className="mt-3 whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <p className="text-white/50">{ds.stand}</p>
    </LegalPageShell>
  );
}
