/**
 * ESC/POS command builder for 80mm thermal printers (48 chars/line, Font A)
 * Outputs TWO copies (STORE + CUSTOMER) in a single transmission with auto-cut.
 * Uses "PHP" instead of "₱" to avoid encoding issues.
 */

import { ReceiptData, CMD, concat } from './escpos';

const LINE_WIDTH = 48;

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function lf(): Uint8Array {
  return new Uint8Array([0x0a]);
}

function padRight80(str: string, len: number): string {
  return str.substring(0, len).padEnd(len);
}

function padLeft80(str: string, len: number): string {
  return str.substring(0, len).padStart(len);
}

function center80(str: string): string {
  const trimmed = str.substring(0, LINE_WIDTH);
  const pad = Math.max(0, Math.floor((LINE_WIDTH - trimmed.length) / 2));
  return ' '.repeat(pad) + trimmed;
}

function divider80(): string {
  return '-'.repeat(LINE_WIDTH);
}

/**
 * Format item line for 80mm: QTY(2) + space(1) + NAME(28) + space(1) + AMOUNT(16)
 */
function formatItemLine80(qty: number, name: string, amount: number): string {
  const qtyStr = String(qty).padStart(2);
  const nameStr = name.substring(0, 28).padEnd(28);
  const amtStr = amount.toFixed(2).padStart(16);
  return qtyStr + ' ' + nameStr + ' ' + amtStr;
}

/**
 * Format key-value line within 48 chars
 */
function formatKV80(key: string, value: string): string {
  const maxKeyLen = LINE_WIDTH - value.length - 1;
  return padRight80(key, maxKeyLen) + ' ' + value;
}

/**
 * Build ESC/POS bytes for a single copy (80mm / 48 chars)
 */
function buildSingleCopy80(data: ReceiptData, copyLabel: string): Uint8Array {
  const parts: Uint8Array[] = [];
  const addCmd = (cmd: Uint8Array) => parts.push(cmd);
  const addLine = (text: string) => { parts.push(textToBytes(text)); parts.push(lf()); };
  const addEmpty = () => parts.push(lf());

  // Initialize
  addCmd(CMD.INIT);

  // Copy label
  addCmd(CMD.ALIGN_CENTER);
  addCmd(CMD.BOLD_ON);
  addLine(`----- ${copyLabel} -----`);
  addCmd(CMD.BOLD_OFF);

  // Reprint label
  if (data.isReprint) {
    addCmd(CMD.BOLD_ON);
    addLine('*** REPRINT COPY ***');
    addCmd(CMD.BOLD_OFF);
  }

  // Header
  addCmd(CMD.BOLD_ON);
  addLine(data.storeName || 'FIFTH D FRIED CHICKEN KIOSK.');
  addCmd(CMD.BOLD_OFF);
  if (data.branchName) addLine(data.branchName);
  addLine(divider80());
  addLine('ORDER SLIP');
  addLine('NOT OFFICIAL RECEIPT');
  addLine(divider80());

  // Transaction info
  addCmd(CMD.ALIGN_LEFT);
  addLine(formatKV80('Slip #:', data.orderSlipNumber || ''));
  addLine(formatKV80('Date  :', data.date));
  addLine(formatKV80('Time  :', data.time));
  addLine(formatKV80('Cash  :', data.cashier));
  addLine(divider80());

  // Items
  for (const item of data.items) {
    addLine(formatItemLine80(item.qty, item.name, item.amount));
    if (item.specialInstruction) {
      addLine('   >> ' + item.specialInstruction.substring(0, 42));
    }
    if (item.discountLabel) {
      const safeLabel = item.discountLabel.replace(/₱/g, 'PHP');
      addLine('   ' + safeLabel.substring(0, 44));
    }
    if (item.idNumber) {
      addLine('   ID: ' + item.idNumber.substring(0, 40));
    }
  }
  addLine(divider80());

  // Subtotal
  addLine(formatKV80('Subtotal:', data.subtotal.toFixed(2)));

  // Service charge
  if (data.serviceCharge) {
    addLine(formatKV80(`Svc Charge (${data.serviceCharge.percent}%):`, data.serviceCharge.amount.toFixed(2)));
  }

  // Total (bold + double height)
  addCmd(CMD.BOLD_ON);
  addCmd(CMD.DOUBLE_HEIGHT);
  addLine(formatKV80('TOTAL:', data.total.toFixed(2)));
  addCmd(CMD.NORMAL_SIZE);
  addCmd(CMD.BOLD_OFF);

  // Payment info
  addLine(formatKV80('Payment:', data.paymentMethod.toUpperCase()));
  if (data.cashReceived !== undefined) {
    addLine(formatKV80('Received:', data.cashReceived.toFixed(2)));
  }
  if (data.change !== undefined && data.change > 0) {
    addLine(formatKV80('Change:', data.change.toFixed(2)));
  }

  // Footer
  addCmd(CMD.ALIGN_CENTER);
  addLine(divider80());
  if (data.isReprint) {
    addLine('*** REPRINT COPY ***');
  }
  addLine('THIS IS NOT A VALID');
  addLine('OFFICIAL RECEIPT.');
  addLine('Manual OR will be issued.');
  addLine(divider80());
  addLine('Thank you!');

  // Feed (2 lines only) and cut
  addEmpty();
  addEmpty();
  addCmd(CMD.CUT);

  return concat(...parts);
}

/**
 * Build TWO copies (STORE + CUSTOMER) in a single ESC/POS byte array.
 * One transmission, two auto-cuts.
 */
export function buildTwoCopyReceiptBytes(data: ReceiptData): Uint8Array {
  const storeCopy = buildSingleCopy80(data, 'STORE COPY');
  const customerCopy = buildSingleCopy80(data, 'CUSTOMER COPY');
  return concat(storeCopy, customerCopy);
}
