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
DE/RU localisation, legal pages, conversion tracking.
