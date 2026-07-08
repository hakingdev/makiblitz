# Референс базового проекта (Dumbo Pizza → Sensei Sushi)

Этот документ фиксирует архитектуру существующего проекта **dumbospizza**, на базе которого
строится новый магазин доставки **Sensei Sushi** (с новым дизайном, тот же движок/логика).

Источник: `/Users/admin/Documents/Dumbo Pizza/dumbospizza`
Назначение: переиспользовать структуру, бэкенд-логику и интеграции, заменив контент/брендинг/дизайн.

---

## 1. Стек технологий

| Слой | Технология |
|------|-----------|
| Фреймворк | **Next.js 14.0.3** (App Router), React 18 |
| Язык | TypeScript 5 (`strict: false`, `target: es5`, alias `@/* → ./`) |
| БД | **MongoDB** через **Mongoose 7** |
| Стилизация | **Tailwind CSS 3** + кастомные цвета (`primary`/`secondary`), шрифт Inter |
| Анимации | framer-motion |
| Иконки | lucide-react, @heroicons/react |
| UI-примитивы | @headlessui/react |
| Формы | react-hook-form + zod |
| Аутентификация | **next-auth v4** (JWT, CredentialsProvider) |
| i18n | next-i18next + react-i18next (локали `ru`, `de`; defaultLocale `ru`, по факту форсится `de`) |
| Платежи | **Stripe 14** (PaymentIntent + Checkout Session) |
| Уведомления | **Telegram** (node-telegram-bot-api), **WhatsApp** (whatsapp-web.js worker + Meta Cloud API) |
| Печать чеков | **node-thermal-printer** (Epson ESC/POS), escpos/escpos-usb |
| POS-интеграция | **Mews POS** (синхронизация меню/заказов) |
| Трекинг конверсий | Meta CAPI, TikTok Events API, Google Ads/GA |
| Деплой | **Docker** (standalone output), docker-compose |
| Прочее | axios, date-fns, cookies-next, uuid, xlsx (экспорт), bcryptjs, jsonwebtoken |

`npm` scripts: `dev`, `build`, `start`, `lint`, `whatsapp-worker` (`node scripts/whatsapp-web-worker.js`).

---

## 2. Структура каталогов

```
app/
  layout.tsx                  # Root layout: <html>, шрифт, ВСЕ трекинг-скрипты (GA/Ads/TikTok/Meta), JSON-LD Restaurant, Providers
  (main)/                     # Витрина (route group с Header/Footer/CookieConsent)
    layout.tsx
    page.tsx                  # Главная (hero + featured + категории)
    menu/                     # Меню
    category/[slug]/          # Категория
    product/[id]/             # Карточка товара
    cart/                     # Корзина
    checkout/                 # Оформление + confirmation/[orderId]
    pre-order/                # Предзаказ + thank-you
    profile/                  # Профиль (история заказов, лояльность)
    track/                    # Отслеживание заказа по номеру
    delivery/ about/          # Инфо-страницы
    impressum/ agb/ datenschutz/ widerrufsbelehrung/   # Юридические (нем. право)
  admin/                      # Админка (защищена next-auth, роли admin/staff)
    layout.tsx                # Auth-guard + AdminSidebar
    login/ page.tsx           # Дашборд (статистика)
    products/ categories/ orders/ customers/ coupons/ delivery-zones/ settings/
    mews-pos/                 # Управление Mews POS (categories/products/orders/modifier-sets/promo-codes)
  api/                        # Route handlers (REST)
    products/ categories/ orders/ coupons/ delivery-zones/ users/ loyalty/
    auth/[...nextauth]/       # NextAuth
    admin/stats/ admin/upload/
    delivery/check-zone/      # Проверка зоны доставки
    settings/ settings/store/ settings/mews-pos/
    stripe/webhook/           # Stripe webhook
    telegram/webhook/         # Telegram webhook
    whatsapp/pending/ whatsapp/mark-sent/   # Очередь для WhatsApp-воркера
    mews-pos/                 # menus/products/orders/modifier-sets/promo-codes/sync/webhook
    mobile/v1/bootstrap/      # Публичные настройки для мобильного приложения
    uploads/[...path]/        # Раздача загруженных файлов (rewrite /uploads/* → /api/uploads/*)
    seed/ create-admin/       # Сидинг и создание админа
    print-agent-status/       # Статус агента печати

components/
  header.tsx footer.tsx hero.tsx                    # Каркас витрины
  product-card.tsx category-section.tsx category-products.tsx featured-products.tsx
  ProductModal.tsx PreOrderModal.tsx                # Модалки выбора товара/предзаказа
  cart/CartModal.tsx cart/CouponInput.tsx
  ImageUpload.tsx LanguageSwitcher.tsx CookieConsent.tsx DeliveryZoneCheck.tsx
  Providers.tsx TranslationProvider.tsx
  admin/admin-sidebar.tsx admin/StatusModal.tsx
  profile/OrderHistoryItem.tsx

lib/
  models/                     # Mongoose-модели (см. §4) + index.ts (connectToDatabase, кэш соединения)
  db/utils.ts                 # Запросы/агрегации (товары, заказы, статистика, createOrderWithLoyalty в транзакции)
  contexts/CartContext.tsx    # Корзина (useReducer + localStorage 'pizza-cart')
  contexts/LanguageContext.tsx
  conversions/                # hash-pii, meta-capi-purchase, tiktok-events-purchase, server-purchase-events
  mews-pos/                   # client.ts, pagination.ts, sync.ts
  mock-modules/usb.js         # Заглушка для usb в Docker
  api-client.ts               # axios-клиент + типизированные вызовы API
  auth.ts                     # NextAuth config + isAdmin/isStaff
  settings.ts                 # getSetting/setSetting (модель Settings) + mewsPosEnabled
  payment.ts                  # Stripe: createPaymentIntent/confirmPayment/checkoutSession/webhook
  telegram.ts whatsapp.ts     # Уведомления о заказах/статусах
  printing.ts                 # Печать чеков (кухня/клиент)
  loyalty.ts                  # Программа лояльности (10 баллов/€, 100 баллов = 1€)
  order-acceptance-hours.ts   # Часы приёма заказов (timezone Europe/Berlin)
  seed-data.ts seed-products.ts
  upload.ts                   # Сохранение base64-изображений в public/uploads
  i18n.ts i18n-config.ts

public/
  images/    locales/{de,ru}/common.json   # ~500 строк переводов

deploy/    # docker-compose.prod.yml, setup_server.sh, env.production
types/  additional.d.ts  next-env.d.ts
Dockerfile(.new/.prod)  docker-compose.yml  docker-mock.js
next.config.js  tailwind.config.js  tsconfig.json  next-i18next.config.js  postcss.config.js
```

---

## 3. Архитектура слоёв

1. **Витрина `(main)`** — публичный магазин. Каталог → товар (ProductModal с размерами/допами) → корзина (CartContext, localStorage) → checkout → создание заказа через `POST /api/orders`.
2. **Админка `/admin`** — защищена next-auth (роли `admin`/`staff`), CRUD товаров/категорий/купонов/зон, заказы, клиенты, статистика, настройки магазина, управление Mews POS.
3. **API `/api/*`** — Next.js route handlers, прямой доступ к Mongoose. Каждый handler сам вызывает `connectToDatabase()`.
4. **Интеграции** — Stripe, Telegram, WhatsApp, термопечать, Mews POS, трекинг конверсий (Meta/TikTok/Google).
5. **Мобильное API `/api/mobile/v1`** — публичный bootstrap-эндпоинт настроек.

---

## 4. Модели данных (Mongoose)

Все модели: `mongoose.models.X || mongoose.model('X', schema)` (защита от повторной регистрации), `timestamps: true`.

- **Product** — `name, description, category(ref), basePrice, image, available, featured, valentinePromo, taxRate`, поля `mews*` (синхронизация POS), `extras{toppings,sauces,sides}[{name,price}]`, `sizes[{id,name,size,priceModifier}]`.
- **Category** — `name, slug(unique), image, icon, active, order, mewsProductTypeId`.
- **Order** — `orderNumber(auto YYMMDD+seq в pre-save), user?, customerName, phoneNumber, email?, items[], deliveryAddress, deliveryZone, deliveryType(delivery|pickup), deliveryFee, subtotal, tax, discount, loyaltyPointsUsed/Earned, total, paymentMethod(cash|card|online), paymentStatus, status(new|preparing|ready_for_delivery|delivering|completed|cancelled), desiredDeliveryTime, telegramMessageId, mewsOrderId, kitchen/customerPrintStatus, statusUpdates[]`. Метод `updateStatus()`.
- **User** — `name, email?(sparse unique), phoneNumber(unique, нем. формат), password(bcrypt, select:false), addresses[], role(customer|admin|staff)`. Метод `comparePassword()`.
- **LoyaltyProgram** — `user(unique), phoneNumber(unique), balance, totalEarned, totalRedeemed, transactions[{type:earn|redeem,...}]`. Методы `addPoints/redeemPoints`.
- **Coupon** — `code(unique,upper), discountType(fixed|percentage), discountValue, validFrom/To, minOrderAmount, usageLimit/Count, active`. Virtual `isValid`, методы `isValidForOrder/calculateDiscount/use`.
- **DeliveryZone** — `name, minOrderAmount, deliveryFee, maxDistance, active, sortOrder`.
- **Settings** — key/value (`value: Mixed`). Основной ключ `storeSettings` (часы приёма, токены Telegram, Stripe-ключи, тексты «закрыто» и т.п.). Доступ через `lib/settings.ts`.
- **WhatsAppQueue** — очередь исходящих сообщений для воркера.

`connectToDatabase()` кэширует соединение в `global.mongoose` (важно для serverless/hot-reload).

---

## 5. Ключевая бизнес-логика

### Корзина (`CartContext`)
useReducer, персист в `localStorage['pizza-cart']`. Считает subtotal/total, **бесплатная доставка от €30** (`FREE_DELIVERY_THRESHOLD`), tax=0, скидка лояльности (100 баллов=1€) и купон. Самовывоз → deliveryFee=0. `canProceedToCheckout` проверяет минимальную сумму зоны.

### Создание заказа (`POST /api/orders`)
1. Проверка **часов приёма** (`ordersStartHour`/`ordersEndHour`, timezone, `ordersBlockedUntil`) — иначе 403 с сообщением.
2. Трансформация items под схему Order.
3. Сохранение (pre-save генерирует `orderNumber`).
4. Лояльность (начисление/списание).
5. Side-effects: `sendOrderNotification` (Telegram), `printOrderReceipts` (термопечать), `sendOrderPlacedNotification` (WhatsApp), `sendServerPurchaseConversionEvents` (Meta CAPI + TikTok).

### Лояльность
1€ = 10 баллов начисления; 100 баллов = 1€ скидки. Транзакции в `createOrderWithLoyalty` (Mongo-сессия/транзакция).

### Аутентификация
next-auth JWT, только `admin`/`staff` могут войти. Guard в `app/admin/layout.tsx`. Хелперы `isAdmin/isStaff`.

---

## 6. Интеграции (что нужно переконфигурировать для нового магазина)

| Интеграция | Источник конфига | Что менять |
|-----------|------------------|------------|
| Telegram | `storeSettings` или env `TELEGRAM_TOKEN/CHAT_ID` | новый бот/чат |
| WhatsApp | очередь + воркер / Meta Cloud API | номер, шаблоны (тексты на DE) |
| Stripe | `storeSettings.stripeSecretKey` или env | новые ключи |
| Печать | env `KITCHEN_PRINTER_INTERFACE`, `CUSTOMER_PRINTER_INTERFACE` | принтер магазина |
| Mews POS | env `MEWS_POS_API_KEY/BASE_URL` + `mewsPosEnabled` | по необходимости |
| Трекинг | **захардкожено в `app/layout.tsx`** | GA `G-XXXXXXXX`, Ads `AW-11384333898`, TikTok `D5UFMAJC77U2HKOKTTSG`, Meta Pixel `900934192877252` |
| Conversions API | env | Meta CAPI токен, TikTok токен |

---

## 7. Брендинг / контент, который надо заменить под Sensei Sushi

- **`app/layout.tsx`**: `<title>`, description, keywords, OpenGraph, **JSON-LD `Restaurant`** (name, адрес `Kurhausstraße 11A`, `Bad Kissingen 97688`, geo, телефон, часы, `servesCuisine`), canonical `dumbospizza.de`, hreflang. Все пиксели/трекинг-ID.
- **`tailwind.config.js`**: палитра `primary` (бежево-коричневая) / `secondary` (красная) — заменить на тему суши.
- **`public/images/`**: `pizza-hero*.png` → изображения суши.
- **`public/locales/{de,ru}/common.json`**: все тексты UI.
- **Домен/SEO**: упоминания `dumbospizza.de`, Bad Kissingen, зоны доставки (Garitz, Hausen, …).
- **Дефолтные сообщения** «магазин закрыт», тексты в `storeSettings`.
- **Контент-страницы**: about, impressum, agb, datenschutz, widerrufsbelehrung.
- Названия в коде: `name: "pizza-delivery"` (package.json), MongoDB db `pizzadelivery`, localStorage key `pizza-cart`, термины «pizza» в моделях/комментариях.
- **`valentinePromo`** на Product — рудимент акции, при желании переименовать/удалить.

---

## 8. Окружение (.env)

```
NODE_ENV
MONGODB_URI=mongodb://mongodb:27017/pizzadelivery
NEXTAUTH_SECRET / NEXTAUTH_URL
TELEGRAM_TOKEN / TELEGRAM_CHAT_ID   (в коде также TELEGRAM_BOT_TOKEN/WEBHOOK_SECRET)
STRIPE_SECRET_KEY / STRIPE_PUBLIC_KEY
SEED_SECRET_KEY
NEXT_PUBLIC_GA_ID
MEWS_POS_API_KEY / MEWS_POS_BASE_URL / MEWS_POS_ENABLED
KITCHEN_PRINTER_INTERFACE / CUSTOMER_PRINTER_INTERFACE
```
Деплой: `output: 'standalone'`, Docker + docker-compose, `deploy/setup_server.sh`.

---

## 9. Замечания / технический долг

- `tailwind.config.js` ссылается на `./pages/**` — каталога `pages/` нет (проект на App Router). Безвредно.
- `package.json` ссылается на `scripts/whatsapp-web-worker.js`, но каталога `scripts/` в репозитории нет (воркер вынесен/деплоится отдельно).
- Дубли: `lib/whatsapp-queue.model.ts` и `lib/models/whatsapp-queue.model.ts`; `package-lock.js333on` (битый артефакт), `Dockerfile`/`Dockerfile.new`/`Dockerfile.prod`.
- Трекинг-ID и контактные данные **захардкожены** в `app/layout.tsx` — главный объект замены.
- Проект **не под git** (нужно инициализировать для нового).
- TypeScript нестрогий (`strict:false`, `noImplicitAny:false`), `target: es5`.

---

## 10. План перехода на Sensei Sushi (предварительно)

1. Скопировать структуру dumbospizza → sensei sushi (без `node_modules`, `.next`, битых артефактов).
2. `git init`, переименовать пакет/БД/localStorage-ключи под sushi.
3. Заменить брендинг: layout/SEO/JSON-LD, Tailwind-палитра, шрифты, images, локали.
4. Перенастроить интеграции (свои ключи Telegram/Stripe/трекинг/принтер).
5. Новый дизайн витрины (header/footer/hero/product-card/модалки) — логику корзины/checkout сохранить.
6. Сидинг каталога суши (категории/товары/размеры/допы).
7. Обновить контент-страницы и юридические тексты.
