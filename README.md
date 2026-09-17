# Ganesh Café — Restaurant Operating Platform

A single React application running **two portals over one shared realtime store**: a guest QR
dining PWA and a Medusa-style managerial POS / back-of-house suite.

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # production bundle
npm test         # 443 tests: logic, reducer, persistence, every component, every route
```

> **There is no server and no SQL database.** This is a deliberately self-contained demo: the
> "backend" is the reducer store in `src/context/StoreContext.jsx` plus the versioned
> `localStorage` snapshot in `src/lib/storage.js`. Those two layers are the ones under test —
> see [Tests](#tests). Swapping in a real API means replacing `storage.js` and the action
> handlers; nothing in the components reads storage directly.

## The two portals

| Route | Purpose |
| --- | --- |
| `/` · `/t/:tableId` · `/?table=T5` | Guest dining PWA (defaults to T1) |
| `/store` … `/store/feedback` | Managerial POS & back-of-house suite (15 routes) |

The **Guest App / Manager POS** switcher sits in the bottom-left corner and is hidden below
`md` (use `Alt+1` / `Alt+2` there). It is the only portal control — the sidebar has no separate
"preview guest app" button, and its footer keeps a clear band for the pill.

On the guest side the table selector is a chip **beside the café name** in the header:
`Ganesh Café [T1 ▾]`. It opens a grid of all twelve tables and re-points the session exactly as
scanning a different QR code would.

## Demo credentials

Role-based access is enforced with 4-digit PINs. The app opens unlocked as the Manager.

| Staff | Role | PIN | Can open |
| --- | --- | --- | --- |
| Vinit Sharma | Manager | `1234` | Everything |
| Priya Nair | Cashier | `2222` | Floor, orders, billing, drawer, invoices, feedback |
| Rakesh Yadav | Kitchen | `3333` | Kitchen display, live orders |
| Anil Kumar | Cashier | `4444` | As above |

Lock the register from the sidebar footer or the header. Opening a restricted area as a
Cashier shows an inline "manager PIN required" pad instead of the page.

## What boots up

The demo seeds a restaurant mid-service rather than an empty shell: T1/T3/T6/T8 in service,
one unacknowledged round, a **late** ticket on the pass (T6 at 19 minutes), T5 billed and
waiting, T10 reserved, three settled invoices, a live shift with float and petty-cash
movements, eight expenses across five categories, two historical campaigns (one with
1,248 sent / 842 opened / 312 walk-ins / ₹48,750 attributed), five guest reviews and
fourteen CRM records.

Everything persists to `localStorage`, so a refresh keeps the state. **Reset demo data** in
the sidebar footer restores the factory seed.

## Realtime without a backend

One `useReducer` store in `src/context/StoreContext.jsx` owns tables, rounds, KDS, billing,
shifts, CRM, campaigns and feedback. The two portals are two views over the same state.

- **Cross-tab sync** — writes go to `localStorage` and a `storage` listener rehydrates other
  tabs, so a guest tab and a POS tab stay live together. Open `/` in one window and `/store`
  in another to watch orders land.
- **Audio** — the reducer only records *intent* to chime (`chime: {kind, seq}`); an effect
  plays it through a Web Audio synth. Browsers block audio until a gesture, so the context
  unlocks on the first pointer or key event, and the header has a mute toggle.
- **Campaign delivery** — sending a broadcast raises a real operating-system notification (see
  below), slides a banner down on the guest screen, and then animates through simulated
  delivery stages to completed.
- **Opt-outs are honoured everywhere** — a guest marked *opted out* stays in the CRM but is
  filtered out of every campaign audience, and the composer shows the reachable count next to
  the number excluded. Disabling the system-notification channel drops messages rather than
  queueing them, so re-enabling never fires a backlog.

## Real notifications, not a mock banner

The push channel is genuinely wired to the browser rather than simulated in the page:

- `public/sw.js` owns the notification the OS shows and focuses the café screen when one is
  clicked. It also answers `fetch` — required for the app to be installable — with a handler
  that deliberately does nothing, so no cache can ever serve a stale bundle.
- `src/lib/notifications.js` asks for permission, delivers through
  `ServiceWorkerRegistration.showNotification` — the same path a real Web Push payload takes —
  and reports honestly: it returns `{shown, via}` rather than claiming success it did not
  achieve, and never throws when the API is missing or blocked.
- `NotificationBridge` in `src/components/SystemNotifications.jsx` watches the store's push
  feed and mirrors every new entry to the OS. Messages already in the feed at mount are treated
  as history, so reloading never replays the last broadcast.
- `public/manifest.webmanifest` + generated icons mean the notification is labelled
  "Ganesh Café" instead of the raw origin.

The guest header offers *Turn on notifications* (firing a real confirmation the moment it is
granted); the POS campaign composer shows the live permission state plus a **Send test
notification** button that reports whether delivery actually happened.

## Installing the guest app (and the 10% that comes with it)

The offer card in the guest app carries a **Get 10% off** option, and it is not a mock:
`src/lib/install.js` captures Chrome's own `beforeinstallprompt`, holds it, and hands it back on
the tap — the real install dialog opens and the app lands on the home screen with its own icon
and window. `InstallBridge` starts listening before React renders (the event fires
once, early) and records the reward the moment the app is installed, including for a guest who
already has it installed and opens it from their home screen.

The reward is a real discount, not a badge: `APP10` is a normal coupon in `src/lib/pricing.js`,
but with **no minimum spend** — deliberately better than the ₹500 welcome offer next to it. It
shows up in the basket, in the guest's bill summary, and, because it rides onto the table's
bill when the guest orders, the cashier sees "10% off · app install reward" already applied at
settlement. No code has to be re-entered behind the counter.

Browsers that never offer a prompt — iOS Safari, Firefox, in-app browsers — get honest
step-by-step instructions for that platform instead of a button that silently does nothing,
with a one-tap claim so the reward is not lost to a missing API.

Installability is real: manifest with `standalone` display plus `any` and `maskable` icons, a
service worker active at `/` with a fetch handler, `theme-color`, and the iOS
`apple-mobile-web-app-*` metas.

## Order lifecycle

```
Sent → Accepted → Cooking → Ready → Served → Paid
```

Legal transitions live in one `TRANSITIONS` map; anything else is rejected by the reducer.
Placing a round chimes the POS and raises an alert · acknowledging silences it and pushes the
ticket to the KDS · ticking the first item moves it to Cooking · ticking every item (or
bumping) marks it Ready and pushes a kitchen notification to the guest · settling issues a GST
invoice, frees the table and invites the guest to rate the visit.

## Money

Prices are tax-exclusive. `subtotal → discount → CGST 2.5% + SGST 2.5% → total`, computed in
one place (`src/lib/pricing.js`) and covered by unit tests.

A **10% welcome offer** auto-applies above ₹500 and is replaced by any manual cashier discount
or coupon (`WELCOME20` · `FLAT50` · `FEAST100` · `PANEER15`). Invoices continue the
`INV/26-27/000N` series and reprint on an 80mm thermal layout — `@media print` isolates
`#print-area`, so the receipt or the A4 QR sheet prints alone.

## QR codes

The QR Studio generates real, scannable SVG codes locally (byte mode, error correction M) for
four destination types: table menu, promotion, feedback-only and custom. Six cards fit an A4
sheet; download a single SVG or print the whole grid. Each card carries a short security hash
derived from its own URL.

Dish photography is optional: menu items render a monochrome category tile unless you paste a
photo URL in **Menu Manager → Photo URL**.

## Tests

`npm test` runs 443 tests over 12 suites, all against the real store and the seeded restaurant
rather than toy fixtures.

| Suite | What it pins down |
| --- | --- |
| `lib/pricing.test.js` | Discount resolution, coupon rules, CGST/SGST split, tender and change |
| `lib/selectors.test.js` | Every derived number: bills, KDS queue, dashboards, drawer, CRM, campaign rates |
| `lib/orders.test.js` | The six-state machine, its illegal transitions, role access, domain constants |
| `lib/format.test.js` | Money grouping, clocks, durations, hashes, percentage rounding |
| `lib/qr.test.js` | Destination URLs, security hashes, real SVG encoding, downloads |
| `lib/storage.test.js` | The persistence layer: round trip, version gate, corrupt data, cross-tab channel |
| `lib/notifications.test.js` | Permission gating, delivery payload, worker fallback, honest failure |
| `lib/install.test.js` | Prompt capture, accepted/refused/spent prompts, standalone detection, manual steps |
| `context/StoreContext.test.js` | The order lifecycle, plus a **totality** block that drives all 53 actions for completeness, purity and serialisability |
| `components/components.test.jsx` | Every shared, guest and POS component mounted with seeded props |
| `pages/pages.test.jsx` | All 15 screens render inside the router and store; deep links `?table=`, `/t/:id`, `?feedback=1` |
| `App.routes.test.jsx` | Backlink integrity: every sidebar entry resolves to a page, every page has an entry |
| `coverage.test.js` | Walks the import graph and fails by name if any component or page is not mounted by a test |

## Layout

```
src/
├── context/StoreContext.jsx      unified store: reducer, actions, persistence, audio, sync
├── data/                         menu, tables, guests, staff, and the factory seed
├── lib/                          pricing · selectors · orders · format · qr · audio · storage · ticker
│                                 install (PWA) · notifications (real OS pushes)
├── components/
│   ├── ui/                       Medusa-style flat primitives (buttons, badges, modals, keypads…)
│   ├── guest/                    header, table dropdown, category nav, dish card, basket,
│   │                             tracker, review, push toast
│   ├── store/                    sidebar, header, floor plan, order/KDS cards, cashier keypad,
│   │                             thermal invoice, drawer modals, PIN pad, QR sheet, campaign stats
│   ├── SystemNotifications.jsx   store push feed → real OS notifications
│   ├── InstallBridge.jsx         captures the browser install prompt, records the reward
│   └── DemoSwitcher.jsx          bottom-left portal switcher (hidden below md)
├── pages/                        GuestPage + 14 store pages
└── public/                       sw.js · manifest · generated app icons
```

## Design language

Medusa-admin utilitarianism, enforced rather than suggested: `zinc-50` canvas on white cards,
1px hairline borders, flat pill badges as the only status vocabulary (emerald / amber / rose /
zinc / indigo), monospaced tabular figures for money and timers, dense `divide-y` grids, and
quiet `hover:bg-zinc-50/80`. No gradients, glassmorphism, glow or drop shadows anywhere.
