

## FWC POS — Controlled Slip & Audit System Upgrade

### Current State Analysis

The existing POS already has:
- Order slip numbering via `next_order_slip_number` DB function (format: `MMDDYY-XXXX-BRANCHCODE`)
- Void/Refund flow with supervisor PIN approval and reason selection
- Daily summary + Z-Reading report
- Sales Invoice PDF generation
- `completed_sales`, `void_refund_log`, `supervisors`, `pos_settings` tables

What needs to change/be added based on the spec:

### Implementation Plan

#### Task 1: Update Order Slip Number Format
- Change format from `MMDDYY-XXXX-BRANCHCODE` to `OS-{BRANCH}-{YYMMDD}-{0001}`
- Update the `next_order_slip_number` DB function via migration
- No code changes needed beyond the DB function since `generateOrderSlipNumber` already calls `next_order_slip_number` RPC

#### Task 2: Create Slip Audit Table + Reprint Log
- New migration to create `order_slips` table:
  - `id`, `slip_number`, `order_number` (maps to completed_sales), `branch_id`, `device_id`, `cashier_id`, `timestamp`, `total`, `status` (ACTIVE/VOID), `void_reason`, `void_note`, `void_by`, `void_timestamp`, `created_at`
- New `reprint_log` table:
  - `id`, `slip_number`, `timestamp`, `reason`, `note`, `supervisor`, `created_at`
- RLS: public access (matching existing pattern — no auth system)

#### Task 3: Upgrade Void Flow with Structured Reasons
- Update `VoidRefundFlow.tsx` void reasons to match spec exactly: "Customer Cancelled", "Wrong Item", "Duplicate Order", "System Error", "Supervisor Override"
- Add optional note field (already partially exists with "Other" reason — formalize it)
- On void confirmation: update `order_slips` status to VOID, add watermark text to invoice re-render

#### Task 4: Build Reprint System
- New component `ReprintFlow.tsx`: supervisor PIN → reason dropdown → optional note → reprint
- Reprint reasons: "Customer Lost Copy", "Printer Error", "Paper Jam", "Supervisor Request", "Audit Verification"
- Reprint re-generates the same receipt/invoice with "REPRINT COPY" label — does NOT increment slip counter
- Log each reprint to `reprint_log` table
- Add reprint button to Daily Summary order rows (next to Void/Refund)

#### Task 5: Build Slip Summary Dashboard
- New component `SlipSummaryDashboard.tsx` showing:
  - Total Slips, Active Slips, Voided Slips, Total Active Sales, Reprint Count
  - Data sourced from `order_slips` and `reprint_log` tables
- CSV Export button: exports daily slip data as CSV download
- End-of-Day Close button (supervisor PIN required)

#### Task 6: End-of-Day Close System
- Add `day_close` record in `pos_settings` or new `day_close_log` table
- Store: close timestamp, supervisor who closed, branch
- When closed: block new transactions in `handleCompletePayment` with a check
- Add `is_day_closed` state to POS page, checked on mount and after close
- Supervisor can reopen (future-ready flag)

#### Task 7: Wire Into POS Page
- Add Slip Summary button to POS header (new view: `'slip-summary'`)
- Insert `order_slips` record during `handleCompletePayment` (after `saveSale`)
- Add reprint action to Daily Summary order rows
- Ensure void flow updates `order_slips` status
- Add "VOID" watermark to `generateInvoice.ts` when reprinting voided orders
- Add "REPRINT COPY" label to `generateInvoice.ts` and `escpos.ts` receipt builder

#### Task 8: Cloud-Ready Structure
- All new tables use the existing Lovable Cloud backend
- LocalStorage fallback for slip counter (already handled by DB function with fallback in POS.tsx)
- No mandatory cloud dependency — offline queue already exists for inventory

### Files Modified
- `src/pages/POS.tsx` — new view, reprint handler, day-close check, slip record insertion
- `src/components/pos/VoidRefundFlow.tsx` — updated void reasons, optional note, slip status update
- `src/components/pos/generateInvoice.ts` — VOID watermark, REPRINT COPY label
- `src/components/pos/print/escpos.ts` — REPRINT COPY label on receipt
- `src/components/pos/DailySummary.tsx` — add Reprint button per order row
- `src/components/pos/types.ts` — add SlipRecord type
- `src/components/pos/useSalesEngine.ts` — add `saveSlipRecord`, `updateSlipStatus` functions

### New Files
- `src/components/pos/ReprintFlow.tsx` — reprint modal with supervisor approval
- `src/components/pos/SlipSummaryDashboard.tsx` — slip summary + CSV export + EOD close
- `src/components/pos/useSlipManagement.ts` — hook for slip CRUD, day-close state

### Database Migrations
1. Alter `next_order_slip_number` function to produce `OS-{BRANCH}-{YYMMDD}-{XXXX}` format
2. Create `order_slips` table
3. Create `reprint_log` table
4. Create `day_close_log` table

### Guarantees
- No changes to VAT calculations, pricing logic, or receipt layout structure
- Existing sale flow preserved — slip management is additive
- Order slip numbering remains local-first (DB function with client fallback)
- Cloud sync is inherent via existing Lovable Cloud tables but not mandatory

