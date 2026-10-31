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
| `/` | 2:61 · 2:60 | Startseite: hero, promise band, gallery teaser, restaurant, CTA |
| `/galerie` | 15:1103 · 15:594 | the nine roll photos |
| `/speisekarte` | 15:637 · 15:110 | 51 dishes in 9 categories (`lib/menu.ts`), allergen note |
| `/kontakt` | 15:1058 · 15:541 | phone, address, message form → `POST /api/contact` (mail to `MAIL_TO`) |
| `/reservieren` | 6:221 · 6:29 | Step 1 — guests, date, time slot |
| `/reservieren/kontakt` | 6:290 · 6:101 | Step 2 — name, e-mail, phone, wishes |
| `/reservieren/bestaetigt` | 6:358 · 6:172 | Step 3 — confirmation + `.ics` calendar entry |
| `/impressum`, `/datenschutz` | — | legal pages |
| `/confirm`, `/abmelden` + `/api/confirm`, `/api/unsubscribe` | — | kept for links in already-sent waitlist mails |

Mobile navigation: 15:1144. `/restaurant` redirects to `/galerie`.

## Reservations

Rules live in `lib/reservation/config.ts` and `lib/reservation/tables.ts`:

- **Open days:** only 30 + 31 October 2026 for now (`OPEN_DATES`); set it to
  `null` to switch to the regular Friday/Saturday schedule (`OPEN_WEEKDAYS`).
- **Arrival times:** 17:00 – 20:30 every 30 min (`TIME_SLOTS`).
- **Tables:** 11 tables / 30 seats as on the restaurant's floor plan (`TABLES`,
  with plan coordinates), pushable pairs in `TABLE_COMBOS`. Every booking gets
  concrete tables for **2:30 h** (`VISIT_DURATION_MINUTES`): the free table or
  combination with the fewest seats that fit the group.

Flow: step 1 loads per slot the largest group that still gets a table
(`GET /api/reservations/availability`) and greys out times that can't fit it; if the chosen time is overbooked
it says so and suggests another time, and it warns when only 1–2 seats are
left. Step 2 posts to `POST /api/reservations` (201 · 409 full · 429 · 503);
the guest gets a confirmation mail, the owner (`MAIL_TO`) a notification.

Storage: Supabase table `reservations` (with `table_ids`, `source` online /
walk_in), written only through the SQL function `book_reservation`, which
locks the day and picks the tables atomically
(DDL in `supabase/schema.sql` — run the "Table reservations" block once in the
Supabase SQL editor). Without `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
(local dev) bookings go to `reservations.local.json` instead.

## Telegram bot (@makilovereservbot)

Every booking and every Kontakt request is posted to the Telegram chat(s) in
`TELEGRAM_CHAT_ID` (currently the group "Sushi Restraurant"): persons, time,
date, name, e-mail, phone, wishes. Buttons:

- **✍️ Ответить** — the bot asks for the answer (reply to its message); the
  text is mailed to the guest (Brevo, reply-to `MAIL_TO`) and the bot offers
  **💬 WhatsApp** with the same text pre-filled (wa.me link — one tap to send).
- **💬 WhatsApp** — opens a chat with the guest's number (if they gave one).

Replying directly to a booking/request message works too. Mapping back to the
guest goes through the `ref: c|r|e:<uuid>` line in each message, so contact
requests are stored in Supabase (`contact_requests`). If Telegram is down or
not configured, the owner gets the usual e-mail to `MAIL_TO` instead.

E-mails to the restaurant mailbox (`SMTP_USER`) arrive as **📧 Письмо на почту**:
every 2 minutes pg_cron calls `/api/cron/mailbox` (`supabase/cron.sql`), which
reads new INBOX mail over IMAP with the SMTP login (`IMAP_HOST` defaults to
`SMTP_HOST`, port 993; read-only, mails stay unread). Mail from the site itself,
auto-replies, bounces, newsletters and provider notices are skipped; quoted
history and signatures are cut. **✍️ Ответить** answers by e-mail as
`Re: <subject>` in the guest's thread. Stored: sender, subject, Message-ID, date
and the short text (`inbound_emails`, deleted after 90 days by the reminder
job); read position in `mailbox_state`. The first run only remembers where the
mailbox stands — older mail is not posted.

Hall (texts in Russian): `/plan` or 🗺 — floor plan **now** as image, occupied
tables red with guests + arrival time; `/walkin` or 🚶 — guests → pick a free
table on the plan → seated at the current Berlin time; `/list` or 📋 — upcoming
bookings, ❌ cancels one after confirmation and frees its table (no-shows,
cancellations). New bookings arrive as the plan for their time window with the
assigned table outlined.

Setup: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` in
`.env.local` and Vercel, then `npm run telegram:setup -- https://www.makilove.de`
(registers `/api/telegram/webhook` and the bot commands). Writing `/id` to the
bot shows a chat's id. Local testing without a public URL: `npm run dev` +
`npm run telegram:poll` (only while no webhook is set).

## Project structure

```
app/                      # routes (see table above)
components/
  ui/                     # Figma components: Button, Field, Choice, Icon, Wordmark
  site/                   # SiteHeader (+ mobile navigation), SiteFooter/HomeFooter, PageIntro, ReservationCta
  home/                   # Startseite sections
  menu/                   # Speisekarte category + dish row
  contact/                # Kontakt message form
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
