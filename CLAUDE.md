# FWT POS — Claude Code Context

## Project Overview

**FWT POS** is a point-of-sale system for **Fifth D Fried Chicken**, a quick-service restaurant. It runs as a mobile-first web app (Capacitor-based) on iOS/Android tablet devices.

Core features:
- Menu management across 5 categories (sandwiches, chicken, sides, add-ons, beverages)
- Combo eligibility, add-ons, and special instructions
- VAT calculation (inclusive/exclusive, configurable per branch)
- Promotional and manual discounts with optional VAT exemption
- Payments via cash, debit, credit, and e-wallet
- 80mm ESC/POS Bluetooth thermal receipt printing (two-copy: store + customer)
- Inventory deduction via FWTeam App integration
- Supervisor override for sensitive operations (void, refund, reprint)
- Day-close Z-reading reports and slip summaries
- Multi-branch support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18.3.1 + TypeScript 5.8.3 |
| Build | Vite 5.4.19 + SWC |
| Styling | Tailwind CSS 3.4.17 + shadcn/ui (Radix UI) |
| Backend | Supabase (PostgreSQL, Edge Functions) |
| Server State | TanStack React Query 5 |
| Forms | React Hook Form 7 + Zod |
| Mobile | Capacitor 8.1.0 |
| Printing | @kduma-autoid/capacitor-bluetooth-printer |
| Charts | Recharts |
| Icons | Lucide React |
| Fonts | Saira (display), Inter (body) |

---

## Package Manager

**npm** — use `npm` for all installs and script execution. Do not use `bun` or `yarn`.

---

## Dev Commands

```sh
npm run dev          # Dev server on http://localhost:8080 (HMR enabled)
npm run build        # Production build → dist/
npm run build:dev    # Dev-mode build (for staging)
npm run lint         # ESLint (TypeScript + React Hooks)
npm run test         # Vitest (single run)
npm run test:watch   # Vitest in watch mode
npm run preview      # Preview production build locally
```

---

## Project Structure

```
src/
├── pages/
│   └── POS.tsx                    # Main POS screen — entry point for all features
├── components/
│   ├── ui/                        # shadcn/ui components — DO NOT hand-edit
│   └── pos/                       # All POS feature components and hooks
│       ├── print/
│       │   ├── escpos80.ts        # 80mm ESC/POS two-copy receipt builder
│       │   ├── bluetoothPrinter.ts# Bluetooth SPP communication layer
│       │   ├── usePrinter.ts      # Printer state/connection hook
│       │   └── printQueue.ts      # Print job queue
│       ├── useOrderState.ts       # Order items, discounts, combos
│       ├── useDailySummary.ts     # Daily totals & payment method tracking
│       ├── useSalesEngine.ts      # VAT calculation, slip generation, DB save
│       ├── useServiceCharge.ts    # Service charge % & application
│       ├── types.ts               # Shared types (MenuItem, OrderItem, CompletedOrder)
│       └── menuData.ts            # Hardcoded menu items & categories
├── integrations/supabase/
│   ├── client.ts                  # Supabase client
│   └── types.ts                   # Auto-generated DB types — DO NOT hand-edit
├── hooks/                         # Shared hooks (use-mobile, use-toast)
├── lib/utils.ts                   # clsx/tailwind-merge utility
└── utils/                         # downloadFile, shareFile

supabase/
├── functions/                     # Deno edge functions (5 total)
└── migrations/                    # SQL migration history (13 files)

.github/
└── rulesets/main-branch-ruleset.json  # Branch protection config
```

---

## Architecture

- **State**: Local `useState` + custom hooks per domain + React Query for Supabase queries
- **Path alias**: `@/` → `./src/` (configured in `vite.config.ts` and `tsconfig.json`)
- **TypeScript**: Loose config — no strict null checks, no implicit any enforcement
- **ESLint**: Unused vars rule is disabled; react-hooks rules are active

**Payment + Print flow:**
1. Order entry → `OrderPanel` (items, discounts, combos)
2. Pre-payment checks → `PrePaymentModal` (service charge, supervisor override)
3. Payment → `PaymentFlow` (select method, enter amount)
4. `saveSale()` → writes to `completed_sales` in Supabase
5. `buildTwoCopyReceiptBytes()` → ESC/POS byte array
6. `bluetoothPrinter.sendBytes()` → fire-and-forget (does not block payment flow)

---

## Environment Variables

Required in `.env.local` (never committed):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Edge functions use server-side env vars set in the Supabase dashboard (`SUPABASE_SERVICE_ROLE_KEY`, `POS_API_SECRET`, `FWTEAM_API_URL`).

---

## Supabase

- **Project ID**: `ngbniovozalshujbpjoq`
- **Types**: `src/integrations/supabase/types.ts` is auto-generated — do not edit by hand; regenerate via `supabase gen types`
- **Edge Functions** (Deno runtime):
  - `pos-deduct` — Inventory deduction to FWTeam (idempotent, retry logic)
  - `pos-refund` — Refund processing
  - `stock-check` — Stock availability validation
  - `sku-lookup` — Price/detail lookup by SKU
  - `get-pos-data-for-fwteam` — POS data export for FWTeam

**Key tables**: `completed_sales`, `slip_records`, `menu_items`, `branches`, `supervisor_logs`, `pos_transactions`

---

## Testing

- **Framework**: Vitest + jsdom + Testing Library
- **Test files**: `src/**/*.{test,spec}.{ts,tsx}`
- **Setup**: `src/test/setup.ts` (jest-dom matchers, matchMedia polyfill)
- Coverage is minimal — don't assume test coverage exists for new areas

---

## Deployment

- **Web hosting**: Lovable.dev (auto-publish on push to `main`)
- **Mobile**: Capacitor builds for iOS/Android — web dir is `dist/`
- Do not change the `appId` in `capacitor.config.ts`

---

## Important Conventions

- **Do not hand-edit** `src/components/ui/` — shadcn/ui managed files
- **Do not hand-edit** `src/integrations/supabase/types.ts` — auto-generated
- **VAT logic** is in `useSalesEngine.ts` — changes affect all receipt calculations and DB records
- **Supervisor override** is required before void, refund, and reprint operations — always validate password before proceeding
- **Branch protection**: all changes to `main` require a PR with at least 1 approving review (no direct pushes)
- **Brand colors**: Navy, Crimson, Cream, POS Gold — defined in `tailwind.config.ts`
