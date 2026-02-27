/**
 * Sales Invoice Generator — renders a PH VAT-compliant invoice as a downloadable PNG.
 */
import { OrderItem } from './types';
import { calculateItemTotal, calculateItemDiscount, calculateItemFinal } from './useOrderState';
import { VatBreakdown, BranchConfig } from './useSalesEngine';

export interface InvoiceData {
  branchConfig: BranchConfig;
  orderSlipNumber: string;
  controlNumber: number;
  date: string;
  time: string;
  cashier: string;
  items: OrderItem[];
  vatBreakdown: VatBreakdown;
  serviceChargePercent: number;
  paymentMethod: string;
  isReprint?: boolean;
  isVoid?: boolean;
}

const CHAR_WIDTH = 7.4;
const LINE_HEIGHT = 16;
const PADDING = 16;
const COLS = 48;
const CANVAS_WIDTH = COLS * CHAR_WIDTH + PADDING * 2;

function pad(s: string, len: number): string { return s.substring(0, len).padEnd(len); }
function rpad(s: string, len: number): string { return s.substring(0, len).padStart(len); }
function center(s: string): string {
  const t = s.substring(0, COLS);
  const p = Math.max(0, Math.floor((COLS - t.length) / 2));
  return ' '.repeat(p) + t;
}
function kv(k: string, v: string): string {
  const maxK = COLS - v.length - 1;
  return pad(k, maxK) + ' ' + v;
}
function divider(): string { return '-'.repeat(COLS); }

export function buildInvoiceText(data: InvoiceData): string {
  const lines: string[] = [];
  const { branchConfig: bc, vatBreakdown: vb } = data;

  // Reprint / Void labels
  if (data.isReprint) {
    lines.push(center('*** REPRINT COPY ***'));
    lines.push('');
  }
  if (data.isVoid) {
    lines.push(center('*** VOID ***'));
    lines.push('');
  }

  // Header
  lines.push(center(bc.legal_name.toUpperCase()));
  lines.push(center(bc.address));
  lines.push(center(`TIN: ${bc.tin}`));
  lines.push(center(`Branch: ${bc.code}`));
  lines.push(divider());
  lines.push(center('SALES INVOICE'));
  lines.push(divider());

  // Transaction info
  lines.push(kv('Order Slip #:', data.orderSlipNumber));
  lines.push(kv('Control #:', String(data.controlNumber).padStart(6, '0')));
  lines.push(kv('Date:', data.date));
  lines.push(kv('Time:', data.time));
  lines.push(kv('Cashier:', data.cashier));
  lines.push(divider());

  // Column headers: Item / Qty / Unit Price / Disc / Total
  lines.push(pad('Item', 18) + rpad('Qty', 4) + rpad('Price', 9) + rpad('Disc', 8) + rpad('Total', 9));
  lines.push(divider());

  // Items
  for (const item of data.items) {
    const lineTotal = calculateItemTotal(item);
    const disc = calculateItemDiscount(item);
    const final = calculateItemFinal(item);
    const name = item.menuItem.name.substring(0, 18);
    const qty = String(item.quantity);
    const unitPrice = item.menuItem.price.toFixed(2);
    const discStr = disc > 0 ? disc.toFixed(2) : '-';
    const totalStr = final.toFixed(2);

    lines.push(
      pad(name, 18) +
      rpad(qty, 4) +
      rpad(unitPrice, 9) +
      rpad(discStr, 8) +
      rpad(totalStr, 9)
    );

    // Add-ons
    for (const addon of item.addOns) {
      lines.push('  + ' + addon.name.substring(0, 30) + (addon.price > 0 ? ` ₱${addon.price.toFixed(2)}` : ''));
    }

    // Discount detail
    if (item.discount) {
      const discLabel = item.discount.discount_name || item.discount.reason;
      lines.push(`  ${discLabel}`);
      if (item.discount.id_number) {
        lines.push(`  ID: ${item.discount.id_number}`);
      }
    }
  }

  lines.push(divider());
  lines.push('');

  // VAT Breakdown
  lines.push(kv('Gross Sales:', `₱${vb.grossSales.toFixed(2)}`));
  if (vb.discountTotal > 0) {
    lines.push(kv('Less: Discounts:', `₱${vb.discountTotal.toFixed(2)}`));
  }
  lines.push(kv('Net Sales:', `₱${vb.netSales.toFixed(2)}`));
  lines.push('');
  lines.push(kv('VATable Sales:', `₱${vb.vatableSales.toFixed(2)}`));
  lines.push(kv('VAT (12%):', `₱${vb.vatAmount.toFixed(2)}`));
  if (vb.vatExemptSales > 0) {
    lines.push(kv('VAT-Exempt Sales:', `₱${vb.vatExemptSales.toFixed(2)}`));
  }
  lines.push(kv('Zero-Rated Sales:', `₱${vb.zeroRatedSales.toFixed(2)}`));
  if (vb.serviceChargeAmount > 0) {
    lines.push(kv(`Service Charge (${data.serviceChargePercent}%):`, `₱${vb.serviceChargeAmount.toFixed(2)}`));
  }
  lines.push('');
  lines.push(divider());
  lines.push(kv('TOTAL AMOUNT DUE:', `₱${vb.totalAmountDue.toFixed(2)}`));
  lines.push(divider());

  // Payment
  lines.push('');
  lines.push(kv('Payment Method:', data.paymentMethod.toUpperCase()));

  // Footer
  lines.push('');
  lines.push(divider());
  lines.push(center('THIS SERVES AS YOUR'));
  lines.push(center('SALES INVOICE'));
  lines.push(divider());
  lines.push('');
  lines.push(center('--- BIR ACCREDITATION ---'));
  lines.push(center('(Placeholder for future'));
  lines.push(center('BIR accreditation details)'));
  lines.push('');
  lines.push(kv('Control #:', String(data.controlNumber).padStart(6, '0')));

  if (data.isVoid) {
    lines.push('');
    lines.push(center('*** VOID ***'));
  }
  if (data.isReprint) {
    lines.push('');
    lines.push(center('*** REPRINT COPY ***'));
  }

  lines.push('');
  lines.push(center('Thank you!'));

  return lines.join('\n');
}

export function renderInvoiceToCanvas(data: InvoiceData): HTMLCanvasElement {
  const text = buildInvoiceText(data);
  const lines = text.split('\n');

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(CANVAS_WIDTH);
  canvas.height = lines.length * LINE_HEIGHT + PADDING * 2;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.font = `${LINE_HEIGHT - 4}px 'Courier New', Courier, monospace`;
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    ctx.fillText(line, PADDING, PADDING + i * LINE_HEIGHT);
  });

  return canvas;
}

export function downloadInvoice(data: InvoiceData): void {
  const canvas = renderInvoiceToCanvas(data);
  const filename = `SalesInvoice-${data.orderSlipNumber}`;

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
