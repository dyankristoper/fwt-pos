```id="fwc-pos-manual-cutter-rawbt-png-share"

FWC POS — Convert PNG Download Printing to Manual Share-to-RawBT Workflow

⚠️ IMPORTANT:

This modifies an existing working POS.

Do NOT rebuild the POS.

Do NOT modify VAT logic.

Do NOT modify sale logic.

Do NOT modify numbering logic.

Only modify the PNG output transport layer and printing workflow.

----------------------------------------------------

OBJECTIVE

----------------------------------------------------

Replace:

PNG auto-download behavior

WITH:

Manual Share-to-RawBT printing per copy using Web Share API.

Workflow must support manual tear printer (no auto-cut).

----------------------------------------------------

NEW PRINTING FLOW

----------------------------------------------------

After successful payment:

1) Show Print Control Modal

2) Display buttons:

[ Print Copy 1 ]

[ Print Copy 2 ]

[ Print Copy 3 ]

[ Print Sales Invoice ]

Each button:

- Generates PNG

- Uses navigator.share

- Shares PNG to RawBT

- Does NOT auto-trigger next copy

- User manually tears paper before pressing next button

No automatic multi-share loop.

----------------------------------------------------

IMPLEMENTATION REQUIREMENTS

----------------------------------------------------

1) Create utility:

src/utils/shareImage.ts

Function:

export async function shareImage(

  dataUrl: string,

  filename: string

)

Logic:

- Convert dataURL to Blob

- Create File object

- If navigator.canShare supports files:

    await navigator.share({

      files: [file],

      title: filename

    })

- Else:

    fallback to normal download

----------------------------------------------------

2) Modify Existing PNG Generator

Remove:

- download link logic

- automatic file download

Replace with:

await shareImage(imageDataUrl, filename)

----------------------------------------------------

3) Filename Format

Order Slip:

PrintQueue-OS-{BRANCH}-{YYMMDD}-{####}-C{1|2|3}.png

Invoice:

InternalSI-SI-{######}.png

----------------------------------------------------

4) Create Print Control Modal Component

New component:

src/components/ManualPrintModal.tsx

Requirements:

- Shows 4 buttons

- Each button triggers specific share

- Close button

- Does NOT auto-print all

- No loops

- No background timers

----------------------------------------------------

5) Stability Requirements

- No simultaneous share calls

- One share action per user tap

- Must wait for share promise to resolve

- Do NOT trigger multiple shares at once

----------------------------------------------------

6) DO NOT:

- Change slip numbering

- Change supervisor approval

- Change audit logging

- Change PDF logic (only PNG flow)

- Add folder monitoring

- Add background automation

----------------------------------------------------

EXPECTED RESULT

----------------------------------------------------

After sale:

User sees print modal.

User presses:

Print Copy 1 → Share sheet opens → Select RawBT → Print → Tear

Then presses:

Print Copy 2 → Repeat

Then Copy 3

Then Invoice

Fully stable for manual cutter.

----------------------------------------------------

After implementation, output:

1) Modified files

2) shareImage utility code

3) ManualPrintModal component

4) Confirmation numbering unchanged

5) Confirmation audit logic unchanged

END OF SPEC

```