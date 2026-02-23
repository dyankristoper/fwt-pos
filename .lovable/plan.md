

# Fix: Inventory Integration Retry Loop

## Problem

The POS retry queue keeps sending the same `transaction_id` for failed transactions, but the edge function's idempotency check treats FAILED records as final — it returns the cached error response (409) without re-attempting the FWTeam API call. This creates an infinite retry loop that never actually retries.

## Root Cause

In `pos-deduct/index.ts` (line 42):
```
if (existing && existing.status !== "PENDING") {
  // Returns cached response for FAILED — never re-calls FWTeam API
}
```

The client retry queue (`useInventoryIntegration.ts`) reuses the same `transaction_id`, so every retry hits this check and gets the old 404 error back.

## Solution

### 1. Edge Function: Allow retrying FAILED transactions (`pos-deduct/index.ts`)

- Modify the idempotency check to only short-circuit for `SUCCESS` status
- For `FAILED` status, reset to `PENDING` and re-attempt the FWTeam API call
- This way, when the FWTeam API is back up, retries will succeed

### 2. Client: Add retry limit (`useInventoryIntegration.ts`)

- Cap retries at 10 attempts to prevent infinite loops
- Mark transactions as `FAILED` after exceeding the limit
- Show a toast notification when max retries are reached

### 3. Database Cleanup

- Clear the stuck pending transaction (`3b25b994...`) that has been retrying 14+ times
- Clear old FAILED records from `pos_transactions` that were from previous gateway outages

## Technical Details

**`supabase/functions/pos-deduct/index.ts`** changes:
- Change idempotency check: only return cached response for `SUCCESS` status
- For `FAILED` records: update status back to `PENDING` and proceed with API call

**`src/components/pos/useInventoryIntegration.ts`** changes:
- In `retryPendingTransactions`, skip items with `retry_count >= 10`
- Update those items to `status: 'FAILED'` with appropriate error message
- Add toast for max retry exceeded

**Database cleanup:**
- Set `pending_transactions` record `3b25b994...` to `FAILED`
- Delete old test records from `pos_transactions`

