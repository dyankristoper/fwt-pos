

## Plan: Fast RawBT ESC/POS Auto-Print + Transactions Masterlist

This is a significant workflow overhaul: replacing the Manual Print Modal (PNG share-to-RawBT) with direct ESC/POS Bluetooth printing, adding a Completed Transactions masterlist, and verifying sales invoice computations are stored.

### Current State

- **Printing**: Uses a Manual Print Modal that renders PNG canvases and shares them via Web Share API to RawBT. This is slow because RawBT must rasterize/convert the PNG.
- **ESC/POS infrastructure**: Already exists (`escpos.ts` has `buildReceiptBytes` for 32-char/58mm, `bluetoothPrinter.ts` has SPP send, `printQueue.ts` handles queuing). But the current layout targets 58mm (32 chars). Spec requires 80mm (48 chars).
- **Transactions Masterlist**: Does not exist as a dedicated page. DailySummary shows basic order list (slip#, time, method, total). SlipSummaryDashboard shows slip-level data but not full VAT breakdown.
- **Sales Invoice computations**: Already stored in `completed_sales` table with all required fields (gross_sales, discount_total, net_sales, vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales, service_charge_amount, service_charge_percent, total_amount_due, payment_method, cashier_name, order_items, line_discounts). **No schema changes needed.**
- **Missing from DB**: `cash_received` and `change_amount` are not stored. These should be added for complete transaction records.

### Files to Create

1. **`src/components/pos/print/escpos80.ts`** — New 80mm ESC/POS receipt builder (48 chars/line)
   - Rewrite layout functions for 48-char width
   - `buildTwoCopyReceiptBytes(data)` — builds STORE COPY + cut + CUSTOMER COPY + cut in one Uint8Array
   - Same ESC/POS commands (INIT, ALIGN, BOLD, DOUBLE_HEIGHT, CUT)
   - Uses "PHP" instead of "₱" to avoid encoding issues
   - Compact: minimal blank lines, feed only 2 lines before cut

2. **`src/components/pos/TransactionsMasterlist.tsx`** — New Completed Transactions view
   - Fetches from `completed_sales` table for today (with option to pick date)
   - Table columns: Date, Slip #, Gross Sales, Discount, VATable Sales, VAT Amount, VAT-Exempt, Service Charge, Total, Payment, Cashier
   - Row click → detail modal showing full invoice computation breakdown + line items
   - Reprint button in detail view (triggers ESC/POS two-copy print)
   - CSV export

### Files to Modify

3. **`src/pages/POS.tsx`** — Major changes:
   - Remove ManualPrintModal import and state (`printModalData`)
   - After payment: build ESC/POS bytes for two copies (STORE + CUSTOMER) using new `buildTwoCopyReceiptBytes`, send via `bluetoothPrinter.sendBytes()` immediately (fire-and-forget, non-blocking)
   - If Bluetooth not connected, fall back to PNG share (single combined share) or show toast warning
   - Add new POSView `'transactions'` and wire to header button
   - Same change for reprint flow: send ESC/POS directly instead of showing modal
   - Remove `downloadInvoice` / `renderInvoiceToCanvas` imports (no more PDF/PNG invoice printing)
   - Keep invoice data computation for DB storage (already saved via `saveSale`)

4. **`src/components/pos/print/escpos.ts`** — Keep existing 58mm builder but add `copyLabel` support for the 80mm builder to reference shared types (`ReceiptData`)

5. **`src/components/pos/PaymentFlow.tsx`** — Pass back `cashReceived` and `change` values to `handleCompletePayment` so they can be stored and printed

### Database Changes

6. **Migration**: Add two columns to `completed_sales`:
   - `cash_received numeric default null` — amount tendered (cash payments)
   - `change_amount numeric default null` — change given

### Technical Details

**Two-Copy ESC/POS Layout (48 chars, 80mm)**:
```text
\x1B\x40                          ← INIT
\x1B\x61\x01                      ← CENTER
----- STORE COPY -----
\x1B\x45\x01                      ← BOLD ON
FIFTH D FRIED CHICKEN KIOSK.
\x1B\x45\x00                      ← BOLD OFF
Main Branch
------------------------------------------------
ORDER SLIP
NOT OFFICIAL RECEIPT
------------------------------------------------
\x1B\x61\x00                      ← LEFT
Slip #: OS-QC01-260301-0001
Date  : 2026-03-01
Time  : 14:30
Cash  : ANA
------------------------------------------------
 2 Classic Sandwich          250.00
   Senior -PHP25.00
   ID: 12345678
 1 Chicken Box               180.00
------------------------------------------------
Subtotal:                    405.00
Svc Charge (8%):              32.40
\x1B\x45\x01\x1D\x21\x11         ← BOLD + DOUBLE
TOTAL:                       437.40
\x1D\x21\x00\x1B\x45\x00         ← NORMAL
Payment: CASH
Received:                    500.00
Change:                       62.60
------------------------------------------------
THIS IS NOT A VALID
OFFICIAL RECEIPT.
Manual OR will be issued.
------------------------------------------------
Thank you!
\n\n
\x1D\x56\x01                      ← AUTO CUT
\x1B\x40                          ← RE-INIT
... repeat for CUSTOMER COPY ...
\x1D\x56\x01                      ← FINAL CUT
```

**Auto-print flow**:
```
Payment complete → saveSale() → buildTwoCopyReceiptBytes() → bluetoothPrinter.sendBytes() → toast success
```
- `sendBytes` is fire-and-forget (no await blocking UI)
- If not connected: toast warning "Printer not connected — receipt not printed"

**Transactions Masterlist**:
- Queries `completed_sales` with all VAT fields
- Detail modal reuses stored data (source of truth is DB, not frontend recalculation)
- Reprint from detail: builds ESC/POS from stored `order_items` JSON

### What is NOT Changed

- VAT computation logic (`calculateVatBreakdown` in `useSalesEngine.ts`)
- Slip numbering (`generateOrderSlipNumber`, `generateControlNumber`)
- Supervisor approval / audit logging
- Day close / reopen flow
- Bluetooth connection/pairing infrastructure
- `buildReceiptBytes` in existing `escpos.ts` (kept for backward compat)

