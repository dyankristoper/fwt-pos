```id="fwc-pos-manual-cutter-2copy-internal-si-save-only"

FWC POS — Optimize Manual Cutter Workflow (2 Copies + Internal SI Save Only)

⚠️ IMPORTANT:

This modifies an existing working POS.

Do NOT rebuild the system.

Do NOT alter VAT computation.

Do NOT modify slip numbering.

Do NOT modify supervisor approval logic.

Only optimize printing workflow to reduce processing time and printer risk.

----------------------------------------------------

OBJECTIVE

----------------------------------------------------

Reduce print load and stabilize manual cutter process by:

1) Printing ONLY TWO (2) order slip copies:

   - Store Copy

   - Customer Copy

2) DO NOT print Internal Sales Invoice.

   - Generate it

   - Save it internally (download only)

   - Do NOT share it to RawBT.

----------------------------------------------------

NEW PRINTING FLOW

----------------------------------------------------

After successful payment:

Show Manual Print Modal with ONLY:

[ Print Store Copy ]

[ Print Customer Copy ]

[ Save Internal Sales Invoice ]

Remove:

- Print Copy 3

- Auto printing of invoice

----------------------------------------------------

IMPLEMENTATION DETAILS

----------------------------------------------------

1) Modify ManualPrintModal component

Remove:

- Print Copy 3 button

Rename:

Copy 1 → Store Copy

Copy 2 → Customer Copy

----------------------------------------------------

2) Order Slip File Naming

Store Copy:

PrintQueue-OS-{BRANCH}-{YYMMDD}-{####}-STORE.png

Customer Copy:

PrintQueue-OS-{BRANCH}-{YYMMDD}-{####}-CUSTOMER.png

----------------------------------------------------

3) Internal Sales Invoice Handling

- Generate PNG (or PDF if currently PDF-based)

- Use download only (no share)

- Filename format:

InternalSI-SI-{######}.pdf OR .png

- Do NOT trigger share

- Do NOT open RawBT

- Do NOT auto print

----------------------------------------------------

4) Preserve These Systems (Do NOT Modify)

- Branch-based slip numbering

- Supervisor approval (Void)

- Supervisor approval (Reprint)

- Audit logging

- Cloud-ready structure

- End-of-day closing

- CSV export

----------------------------------------------------

5) Stability Rules

- One share action per tap

- No automatic multi-share loop

- Wait for share promise to resolve

- No background automation

----------------------------------------------------

EXPECTED RESULT

----------------------------------------------------

After sale:

User sees modal:

[ Print Store Copy ]

[ Print Customer Copy ]

[ Save Internal Sales Invoice ]

User taps:

Store → Share → RawBT → Tear

Customer → Share → RawBT → Tear

Invoice → Download only

No 3rd slip.

No invoice printing.

Reduced processing time.

Reduced printer overheating risk.

Lower paper jam risk.

----------------------------------------------------

After implementation, output:

1) Modified files list

2) Updated ManualPrintModal code

3) Confirmation slip numbering unchanged

4) Confirmation supervisor logic unchanged

5) Confirmation audit system untouched

END OF SPEC

```