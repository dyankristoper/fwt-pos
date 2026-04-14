# FWT POS — Claude Code Context

## Project Overview

**FWT POS** is a point-of-sale system for **Fifth D Fried Chicken**, a quick-service restaurant. It runs as a mobile-first web app (Capacitor-based) on iOS/Android tablet devices.

Core features:
- Menu management across 5 categories (sandwiches, chicken, sides, add-ons, beverages)
- Combo eligibility, add-ons, and special instructions (max 10 chars)
- VAT calculation (inclusive/exclusive, configurable per branch via `pos_settings`)
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
│   └── POS.tsx                        # Main POS screen — single route, all feature orchestration
├── components/
│   ├── ui/                            # shadcn/ui components — DO NOT hand-edit
│   └── pos/                           # All POS feature components and hooks
│       ├── print/
│       │   ├── escpos80.ts            # 80mm ESC/POS two-copy receipt builder (active)
│       │   ├── escpos.ts              # Legacy ESC/POS helpers / ReceiptData type
│       │   ├── pdfReceipt.ts          # Legacy PDF receipt — unused, kept for reference
│       │   ├── bluetoothPrinter.ts    # Bluetooth SPP communication layer (singleton)
│       │   ├── usePrinter.ts          # Printer state/connection hook
│       │   └── printQueue.ts          # Print job queue
│       ├── AddOnPrompt.tsx            # Overlay: choose add-ons after adding a main item
│       ├── AdminMenuManagement.tsx    # Admin UI for menu item CRUD
│       ├── BranchVatSettings.tsx      # Branch-level VAT mode toggle UI
│       ├── ComboPrompt.tsx            # Overlay: offer combo upgrade for eligible items
│       ├── DailySummary.tsx           # In-session daily totals view
│       ├── DiscountManagement.tsx     # Discount catalog management UI
│       ├── IncidentalsPopover.tsx     # Quick-add incidentals (sides/extras) from order panel
│       ├── ItemDiscountFlow.tsx       # Overlay: apply/remove per-item discounts
│       ├── ManualPrintModal.tsx       # Manual reprint trigger UI
│       ├── MenuPanel.tsx              # Left panel: category tabs + menu item grid
│       ├── OrderPanel.tsx             # Right panel: current order, totals, checkout
│       ├── PaymentFlow.tsx            # Payment method selection + amount entry
│       ├── PrePaymentModal.tsx        # Pre-payment summary: VAT breakdown, service charge
│       ├── PrinterSettings.tsx        # Bluetooth printer connect/disconnect UI
│       ├── ReprintFlow.tsx            # Supervisor-gated reprint flow
│       ├── ServiceChargeSettings.tsx  # Configure service charge % and enable/disable
│       ├── SlipSummaryDashboard.tsx   # Order slip status dashboard
│       ├── SupervisorManagement.tsx   # Supervisor PIN management + cashier name setting
│       ├── TransactionsMasterlist.tsx # Full transaction list from Supabase
│       ├── TransactionsSummaryView.tsx# Summary view + day-close control
│       ├── VoidRefundFlow.tsx         # Supervisor-gated void/refund flow
│       ├── ZReadingReport.tsx         # Z-reading / day-end report
│       ├── generateInvoice.ts         # Invoice generation utility
│       ├── menuData.ts                # Hardcoded menu items, categories, COMBO_SURCHARGE
│       ├── types.ts                   # Shared types (MenuItem, OrderItem, CompletedOrder, etc.)
│       ├── useDailySummary.ts         # In-memory daily totals & payment method tracking
│       ├── useInventoryIntegration.ts # FWTeam inventory deduction integration
│       ├── useOrderState.ts           # Order items, quantities, discounts, combos, add-ons
│       ├── useSalesEngine.ts          # VAT calculation, slip generation, DB save
│       ├── useServiceCharge.ts        # Service charge % config & calculation
│       └── useSlipManagement.ts       # Day-close state, slip tracking
├── integrations/supabase/
│   ├── client.ts                      # Supabase client singleton
│   └── types.ts                       # Auto-generated DB types — DO NOT hand-edit
├── hooks/                             # Shared hooks (use-mobile, use-toast)
├── lib/utils.ts                       # clsx/tailwind-merge utility
└── utils/                             # downloadFile, shareFile helpers

supabase/
├── functions/                         # Deno edge functions (5 total)
└── migrations/                        # SQL migration history (13 files, from 2026-02-17)

.github/
└── rulesets/main-branch-ruleset.json  # Branch protection config
```

---

## Architecture

- **Single route**: `/` → `POS` component. `App.tsx` wraps with `QueryClientProvider`, `TooltipProvider`, `Toaster`, `Sonner`, `BrowserRouter`.
- **State**: Local `useState` + custom hooks per domain + React Query for Supabase queries
- **Path alias**: `@/` → `./src/` (configured in `vite.config.ts` and `tsconfig.json`)
- **TypeScript**: Loose config — no strict null checks, no implicit any enforcement
- **ESLint**: Unused vars rule is disabled; react-hooks rules are active

### POSView states
`POS.tsx` manages a `POSView` union: `'menu' | 'pre-payment' | 'payment' | 'summary' | 'z-reading' | 'printer-settings' | 'supervisors' | 'transactions'`

### Payment + Print flow
1. Order entry → `OrderPanel` (items, discounts, combos)
2. Pre-payment checks → `PrePaymentModal` (VAT breakdown, service charge, no supervisor required here)
3. Payment → `PaymentFlow` (select method, enter amount)
4. `saveSale()` → inserts into `completed_sales` in Supabase
5. `saveSlipRecord()` → inserts into `order_slips`
6. `buildTwoCopyReceiptBytes()` → ESC/POS byte array (two copies in one print job)
7. `bluetoothPrinter.sendBytes()` → fire-and-forget (does NOT block payment flow)
8. `paymentInFlight` ref guards against double-submission

### Order state rules (useOrderState.ts)
- **Sandwiches / Chicken**: always create a new line item; trigger combo prompt if `is_combo_eligible`
- **Sides / Beverages**: stack on existing line (increment qty) if same item with no add-ons
- **Add-ons**: attach to `lastMainItemRef` (most recently added sandwich/chicken); fall back to standalone line if no main item exists
- **Combo drink**: always `comboEligibleDrinks[0]` (FWTea) from `menuData.ts`; adds `COMBO_SURCHARGE` to item total
- **Special instructions**: max 10 characters (enforced in `setSpecialInstruction`)

### VAT calculation (useSalesEngine.ts — calculateVatBreakdown)
- **Inclusive** (default): `vatableSales = netSales / 1.12`, `vatAmount = netSales - vatableSales`
- **Exclusive**: `vatableSales = netSales`, `vatAmount = netSales × 0.12`
- VAT-exempt items are excluded from the taxable base
- Service charge is added after VAT in both modes

### Printer startup behavior
On mount, if `bluetoothPrinter.status.connected === false`, a full-screen blocking overlay is shown with two options: **Connect Printer** (goes to printer-settings view) or **Continue Without Printer** (dismisses overlay, sets `printerWarningDismissed = true`).

### Day-close behavior
When `slipMgmt.dayClose.isClosed === true`:
- "Proceed to Payment" is blocked with a toast error
- Payment completion is blocked even if somehow reached
- Header shows a "Day Closed" badge

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

**Key tables**:

| Table | Purpose |
|---|---|
| `completed_sales` | One row per completed transaction (VAT breakdown, items JSONB, payment method) |
| `order_slips` | Slip records with ACTIVE/VOID status; updated by void flow |
| `slip_records` | (legacy) slip tracking |
| `reprint_log` | Audit log for every reprint (supervisor, reason, note) |
| `menu_items` | Menu item catalog (also hardcoded in `menuData.ts`) |
| `branches` | Branch configuration |
| `supervisor_logs` | Audit trail for supervisor-gated actions |
| `pos_transactions` | Transaction log |
| `pos_settings` | Key-value config: `branch_config`, `vat_mode`, `cashier_name`, service charge settings |

**Supabase RPCs**:
- `next_order_slip_number(p_branch_code)` — generates sequential slip number per branch
- `next_control_number()` — generates sequential control number across branches

**Hardcoded values**:
- `deviceId` is hardcoded as `'TAB-A8-01'` in `POS.tsx:saveSlipRecord` call
- `DEFAULT_BRANCH` fallback in `useSalesEngine.ts`: code `QC01`, Triumph Tower Quezon Ave. Branch

---

## Testing

- **Framework**: Vitest + jsdom + Testing Library
- **Test files**: `src/**/*.{test,spec}.{ts,tsx}`
- **Setup**: `src/test/setup.ts` (jest-dom matchers, matchMedia polyfill)
- Coverage is minimal — don't assume test coverage exists for new areas

---

## Deployment

- **Web hosting**: Lovable.dev (auto-publish on push to `main`)
- **Capacitor app ID**: `app.lovable.6011db5171c1419aaefbba3127025c49` — do not change
- **Mobile**: Capacitor builds for iOS/Android — web dir is `dist/`
- Capacitor server URL points to Lovable project (live reload in dev)

---

## Brand & Styling

Brand colors defined in `tailwind.config.ts` as CSS variable tokens:

| Token | Usage |
|---|---|
| `navy` / `navy-light` / `navy-dark` | Primary header, key UI surfaces |
| `crimson` / `crimson-light` | Destructive actions, alerts |
| `cream` / `cream-dark` | Background tones |
| `pos-gold` / `pos-gold-dark` | Printer connected indicator, highlights |

Font classes: `font-display` (Saira) for headings/labels, `font-body` (Inter) for body text.

---

## Important Conventions

- **Do not hand-edit** `src/components/ui/` — shadcn/ui managed files
- **Do not hand-edit** `src/integrations/supabase/types.ts` — auto-generated
- **VAT logic** is in `useSalesEngine.ts:calculateVatBreakdown` — changes affect all receipt calculations and DB records
- **Supervisor override** is required before void, refund, and reprint operations — always validate password before proceeding
- **Branch protection**: all changes to `main` require a PR with at least 1 approving review (no direct pushes)
- **pdfReceipt.ts** and `escpos.ts` are legacy — active receipt printing uses `escpos80.ts` only
- **menuData.ts** is the source of truth for menu items and `COMBO_SURCHARGE`; `AdminMenuManagement.tsx` syncs to Supabase but the hardcoded data is still used at runtime
