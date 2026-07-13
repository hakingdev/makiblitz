# Makiblitz 🍣

Sushi delivery storefront. Frontend built from the Figma "Sushi Resto Mobile
Apps UI Kit", adapted to a fully responsive **mobile · tablet · desktop** web
app. Business logic (cart, checkout, orders, integrations) is being ported from
the `dumbospizza` engine — see [`BASE_PROJECT_REFERENCE.md`](./BASE_PROJECT_REFERENCE.md).

## Stack

- **Next.js 14** (App Router) · React 18 · TypeScript (strict)
- **Tailwind CSS 3** — design tokens in `tailwind.config.ts`
- Fonts: **Mulish** (UI) + **Rock Salt** (display) via `next/font`
- `lucide-react`, `framer-motion`, `clsx` + `tailwind-merge`

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (static export of all routes)
```

## Coming-soon mode (current phase)

The unfinished shop is hidden behind a German waitlist landing page
(`app/coming-soon/`). `middleware.ts` rewrites **every** route to it while
`COMING_SOON_MODE` is on; only `/impressum`, `/datenschutz`, `/confirm`,
`/abmelden`, the waitlist API routes and static assets pass through.
Fail-safe: the stub also shows when the variable is missing — set
`COMING_SOON_MODE=false` (and restart/redeploy) to bring the shop back.
No shop code was removed.

### Waitlist with double-opt-in (§ 7 UWG / DSGVO)

Signup flow — the owner is notified **only after** the subscriber confirms:

1. `POST /api/subscribe` — validates the form (consent checkbox is enforced
   server-side), appends a `"pending"` record to
   `waitlist-submissions.jsonl` including the consent evidence required by
   Art. 7 Abs. 1 DSGVO (`consentAt`, `consentTextVersion`, `ipHash`,
   `userAgent` — IPs are stored **only** as HMAC-SHA256 hashes, never raw)
   and sends a neutral confirmation mail. Without SMTP configured the
   confirm URL is printed to the server console instead (dev mode).
2. `GET /api/confirm?token=…` — stateless HMAC-signed token (48 h expiry,
   `TOKEN_SECRET`). On success: `"confirmed"` record + owner notification to
   `MAIL_TO` + redirect to `/confirm?state=success|invalid|expired`.
3. `GET /api/unsubscribe?token=…` — opt-out link (no expiry) embedded in the
   footer of every subscriber mail: `"unsubscribed"` record + owner mail +
   `/abmelden` page.

Copy `.env.example` to `.env.local` and fill in `SMTP_*`/`MAIL_*` plus the
two secrets (`TOKEN_SECRET`, `IP_HASH_SECRET` — `openssl rand -base64 32`).
Spam protection: honeypot field + in-memory rate limit (5 requests / 10 min
per hashed IP). UI strings live in `messages/de.json` (add `en.json`
alongside it for English later).

**Housekeeping:** `npm run waitlist:cleanup` (add `-- --dry` for a preview)
deletes unconfirmed `"pending"` records older than 30 days, as promised in
the Datenschutzerklärung — run it manually or via cron. Confirmed/opt-out
records and the pending records of confirmed addresses are kept as consent
evidence.

**Legal pages:** `/impressum` (§ 5 DDG) and `/datenschutz` (Art. 13 DSGVO)
are fully structured; every missing business detail is marked `[TODO: …]`
in `messages/de.json` — replace before launch. Security headers (HSTS,
nosniff, Referrer-Policy, CSP, …) are set in `next.config.js`; fonts are
self-hosted via `next/font`; no cookies/trackers, hence no consent banner.

## Project structure

```
app/
  layout.tsx              # fonts + CartProvider
  page.tsx                # Home (hero, categories, chef's picks, popular)
  menu/                   # /menu (all) + /menu/[slug] (category)
  product/[slug]/         # dish detail (spice, add-ons, quantity)
  cart/  profile/         # cart + profile
components/
  ui/                     # design-system primitives (Button, Chip, QtyStepper, …)
  layout/                 # Shell, Header (top nav), BottomNav (mobile tabs)
  home/ menu/ cart/       # feature components
lib/
  data/menu.ts            # MOCK catalogue (replaced by API/Mongo later)
  cart/CartContext.tsx    # cart state (localStorage `makiblitz-cart`)
  utils.ts                # cn() + EUR price formatting
```

## Responsive behaviour

- **Mobile** (`< md`): single column, sticky bottom tab bar, phone-style header.
- **Tablet/Desktop** (`≥ md`): top navigation, multi-column grids, 2-column
  product detail, centered `max-w-shell` container.

## Status

Frontend on mock data. **Next:** port the dumbospizza backend (MongoDB models,
`/api/orders`, Stripe, Telegram/WhatsApp, loyalty), real dish photography,
DE/RU localisation, conversion tracking, fill in the `[TODO: …]` company
data in `messages/de.json` (Impressum/Datenschutz) before launch.
