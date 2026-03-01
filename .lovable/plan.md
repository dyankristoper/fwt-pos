

## Plan: Remove Auto Inventory Deduction

### What changes

Remove the automatic inventory deduction call that fires after every sale. The online/offline indicator and the `useInventoryIntegration` hook will be fully removed from the POS page.

### Files to modify

1. **`src/pages/POS.tsx`**:
   - Remove `import { useInventoryIntegration }` and the `inventory` hook instantiation (line 5, 41)
   - Remove the inventory deduction block in `handleCompletePayment` (lines 122-134): the `deductInventory` call, its success/failure check, and the queued toast
   - Remove the online/offline status indicator in the header bar (lines 346-353)
   - Remove `Wifi`/`WifiOff` from lucide-react imports if no longer used

2. **No other files deleted** — `useInventoryIntegration.ts` and edge functions (`pos-deduct`, `stock-check`) remain in the codebase in case you want to re-enable or use them manually later.

### What is NOT changed
- Sale logic, VAT computation, numbering, slip structure, printing, supervisor approval, audit logging — all untouched.

