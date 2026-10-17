# MakiLove 🍣

Website + table reservation for the MakiLove sushi restaurant
(Kurhausstr. 11A, 97688 Bad Kissingen). Built mobile-first from the Figma file
**"MakiLove — Sushi Restaurant · Tischreservierung"** (mobile 390 · desktop 1440).

## Stack

- **Next.js 14** (App Router) · React 18 · TypeScript (strict)
- **Tailwind CSS 3** — design tokens in `tailwind.config.ts` (paper/ink/red palette)
- Fonts: **Mulish** (UI) + **Rock Salt** (script accents) via `next/font`
- **Supabase** — same project/tables as before (`supabase/schema.sql`)
- Mail via **Brevo** HTTP API (`lib/waitlist/mailer.ts`)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm test         # vitest
```

## Pages

| Route | Figma | |
|---|---|---|
| `/` | 2:61 · 2:60 | Startseite: hero, promise band, menu teaser, restaurant, CTA |
| `/speisekarte` | 11:99 | "Unsere Rollen. Schön serviert." — 9 roll photos |
| `/restaurant` | 12:99 | "Hier wird aus Sushi ein Abend." — original restaurant photos |
| `/reservieren` | 6:221 · 6:29 | Step 1 — guests, date, time slot |
| `/reservieren/kontakt` | 6:290 · 6:101 | Step 2 — name, e-mail, phone, wishes |
| `/reservieren/bestaetigt` | 6:358 · 6:172 | Step 3 — confirmation + `.ics` calendar entry |
| `/impressum`, `/datenschutz` | — | legal pages |
| `/confirm`, `/abmelden` + `/api/confirm`, `/api/unsubscribe` | — | kept for links in already-sent waitlist mails |

## Reservation flow (current state)

The three steps share one client-side draft (`components/reservation/ReservationProvider.tsx`,
persisted in `sessionStorage`). Slots, lead time and booking window live in
`lib/reservation/config.ts`; dates are computed in `Europe/Berlin`
(`lib/reservation/dates.ts`).

**Not wired yet:** submitting step 2 does **not** store or send anything —
persistence in Supabase, confirmation mail and real slot availability are the
next step.

## Project structure

```
app/                      # routes (see table above)
components/
  ui/                     # Figma components: Button, Field, Choice, Icon, Wordmark
  site/                   # SiteHeader (mobile menu), SiteFooter, ReservationCta, PageShell
  home/                   # Startseite sections
  gallery/                # photo tiles for /speisekarte and /restaurant
  reservation/            # provider, steps, header/footer/progress, summary
  consent/ analytics/     # cookie banner + consent-gated Meta Pixel
lib/
  reservation/            # slot config, Berlin-time date helpers, .ics builder
  waitlist/  email/       # Supabase store, Brevo mailer, e-mail validation (reused)
messages/de.json          # all UI copy
public/images, public/icons  # photos + SVG icons exported from Figma
```

## Notes

- All UI copy is in `messages/de.json`; contact data under `contact`.
- Instagram link in the footer appears once `INSTAGRAM_URL` in `lib/site.ts` is set.
- Meta Pixel loads only after "Alle akzeptieren" and only when
  `NEXT_PUBLIC_FB_PIXEL_ID` is set at build time.
