

## Plan: 5 POS UI/UX Changes

### 1. Merge "Slip Summary" and "Transactions" into one "Transactions Summary" tab

**Files:** `src/pages/POS.tsx`

- Remove the `'slip-summary'` view. Consolidate into `'transactions'` view.
- Remove the separate `FileText` icon button for Slip Summary from the header.
- Rename the `ListChecks` button title to "Transactions Summary".
- Create a new combined view component `TransactionsSummaryView` that uses internal tabs (Radix Tabs) to show both the Slip Summary content and the Transactions Masterlist content side by side.
- Alternatively (simpler): render a tabbed wrapper inside the `'transactions'` view case that toggles between `SlipSummaryDashboard` and `TransactionsMasterlist` content. The wrapper will have two sub-tabs: "Slips" and "Sales". The day-close/reopen controls from SlipSummaryDashboard will remain accessible.

**New file:** `src/components/pos/TransactionsSummaryView.tsx`
- Uses `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` from shadcn.
- "Slips" tab renders `SlipSummaryDashboard` (minus its own back button/header — pass a prop or wrap).
- "Sales" tab renders `TransactionsMasterlist` (minus its own back button).
- Single shared header with back button + date + CSV exports.

Actually, to minimize scope, the simplest approach: render both existing components inside a tab wrapper. Each already has its own header with back button. We'll wrap them and hide individual back buttons by passing the back handler to the wrapper only. But that requires modifying both components.

**Simplest approach:** In `POS.tsx`, replace the two separate view cases and two separate header buttons with one button and one view that renders a tabbed container with both components embedded as-is (each keeps its own back button pointing to `setView('menu')`). The tab wrapper just switches between them.

### 2. Add end-of-day change float table under "Summary" tab

**File:** `src/components/pos/DailySummary.tsx`

Add a section after the "Recent Orders" block with the exact change float table:

| Denomination | Qty | Total (₱) | Purpose |
|---|---|---|---|
| 100s | 10 | 1,000 | For change on 500s or 1,000s. |
| 50s | 14 | 700 | Your workhorse bill for 250-peso items. |
| 20s | 20 | 400 | Essential for 180-peso items. |
| 10s (Coins) | 20 | 200 | For smaller adjustments. |
| 5s (Coins) | 20 | 100 | Buffer for multiple orders. |
| 1s (Coins) | 100 | 100 | General exact change. |

**Total: ₱2,500**

### 3. Replace "No add-ons" with "Proceed?" in AddOnPrompt

**File:** `src/components/pos/AddOnPrompt.tsx`

Change button text from "No add-ons" to "Proceed?"

### 4. Add "Sp Inst" button per cart line item with 10-char input

**Files:** `src/components/pos/types.ts`, `src/components/pos/useOrderState.ts`, `src/components/pos/OrderPanel.tsx`

- Add `specialInstruction?: string` to `OrderItem` type.
- Add `setSpecialInstruction(instanceId, text)` to `useOrderState`.
- In `OrderPanel`, add a "Sp Inst" button next to the "Disc" button per line item.
- Tapping it toggles a small inline input (max 10 chars). Display the instruction text below the item name when set.
- Expose the new handler via props from `POS.tsx`.

### 5. Disable/remove the "Edit site with lovable" toast

The badge/toast comes from the `lovable-tagger` plugin in `vite.config.ts` or is injected by the preview environment. For the published app, appending `?forceHideBadge=true` to the URL hides it (already used in capacitor config). To suppress it in the web build, we can add the query param approach or add CSS to hide the badge element. The most reliable approach: add a small CSS rule in `src/index.css` to hide `[data-lovable-badge]` or the known badge selector, and also check if there's a GPT toast being triggered.

Actually the "Edit site with lovable" toast is a platform-injected element in the preview. It cannot be fully removed via code. However, we can hide it with CSS targeting the badge/widget. We'll add `#lovable-badge { display: none !important; }` to `index.css`.

### Assumptions
- The "Edit site with lovable" toast is the Lovable badge injected in the preview; hiding via CSS is the best available approach.
- Special instructions are display-only in the cart (not printed on receipts yet).
- The merged "Transactions Summary" view uses simple sub-tabs rather than a full component rewrite.

