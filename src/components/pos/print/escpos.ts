/**
 * ESC/POS command builder for 58mm thermal printers (32 chars/line, Font A)
 * Target: OFFICOM PT-120 (ESC/POS compatible)
 */

const LINE_WIDTH = 32;

// ESC/POS Commands
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export const CMD = {
  INIT: new Uint8Array([ESC, 0x40]), // ESC @ — Initialize
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]), // ESC a 2
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]), // ESC E 0
  DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x11]), // GS ! 0x11
  NORMAL_SIZE: new Uint8Array([GS, 0x21, 0x00]), // GS ! 0x00
  CUT: new Uint8Array([GS, 0x56, 0x01]), // GS V 1 — Partial cut
  FEED_3: new Uint8Array([LF, LF, LF]), // 3 line feeds
};

function textToBytes(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

function lineFeed(): Uint8Array {
  return new Uint8Array([LF]);
}

export function padRight(str: string, len: number): string {
  return str.substring(0, len).padEnd(len);
}

export function padLeft(str: string, len: number): string {
  return str.substring(0, len).padStart(len);
}

export function center(str: string): string {
  const trimmed = str.substring(0, LINE_WIDTH);
  const pad = Math.max(0, Math.floor((LINE_WIDTH - trimmed.length) / 2));
  return " ".repeat(pad) + trimmed;
}

export function divider(): string {
  return "-".repeat(LINE_WIDTH);
}

/**
 * Format item line: QTY(2) + space(1) + ITEM(17) + space(1) + AMOUNT(11)
 */
export function formatItemLine(qty: number, name: string, amount: number): string {
  const qtyStr = String(qty).padStart(2);
  const nameStr = name.substring(0, 17).padEnd(17);
  const amountStr = amount.toFixed(2).padStart(11);
  return qtyStr + " " + nameStr + " " + amountStr;
}

/**
 * Format a key-value line within 32 chars
 */
export function formatKV(key: string, value: string): string {
  const maxKeyLen = LINE_WIDTH - value.length - 1;
  return padRight(key, maxKeyLen) + " " + value;
}

/**
 * Concatenate multiple Uint8Arrays
 */
export function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export interface ReceiptData {
  storeName?: string;
  branchName?: string;
  orderSlipNumber?: string;
  orderNumber?: string;
  date: string;
  time: string;
  cashier: string;
  items: { qty: number; name: string; amount: number; discountLabel?: string; idNumber?: string }[];
  subtotal: number;
  serviceCharge?: {
    percent: number;
    amount: number;
  };
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  isReprint?: boolean;
  copyLabel?: string;
}

/**
 * Build complete ESC/POS byte array for receipt
 */
export function buildReceiptBytes(data: ReceiptData): Uint8Array {
  const parts: Uint8Array[] = [];

  const addCmd = (cmd: Uint8Array) => parts.push(cmd);
  const addLine = (text: string) => {
    parts.push(textToBytes(text));
    parts.push(lineFeed());
  };
  const addEmpty = () => parts.push(lineFeed());

  // Initialize
  addCmd(CMD.INIT);

  // Reprint label
  if (data.isReprint) {
    addCmd(CMD.ALIGN_CENTER);
    addCmd(CMD.BOLD_ON);
    addLine("*** REPRINT COPY ***");
    addCmd(CMD.BOLD_OFF);
    addEmpty();
  }

  // Header (centered)
  addCmd(CMD.ALIGN_CENTER);
  addCmd(CMD.BOLD_ON);
  addLine(data.storeName || "FIFTH D FRIED CHICKEN KIOSK");
  addCmd(CMD.BOLD_OFF);
  if (data.branchName) addLine(data.branchName);
  addLine(divider());
  addLine("ORDER SLIP");
  addLine("NOT OFFICIAL RECEIPT");
  addLine(divider());

  // Transaction block (left-aligned)
  addCmd(CMD.ALIGN_LEFT);
  addLine(formatKV("Slip #:", data.orderSlipNumber || data.orderNumber || ""));
  addLine(formatKV("Date :", data.date));
  addLine(formatKV("Time :", data.time));
  addLine(formatKV("Cash :", data.cashier));
  addLine(divider());

  // Items (with per-item discount labels)
  for (const item of data.items) {
    addLine(formatItemLine(item.qty, item.name, item.amount));
    if (item.discountLabel) {
      addLine("   " + item.discountLabel.substring(0, 29));
    }
    if (item.idNumber) {
      addLine("   ID: " + item.idNumber.substring(0, 25));
    }
  }
  addLine(divider());

  // Subtotal
  addLine(formatKV("Subtotal:", data.subtotal.toFixed(2)));

  // Service charge
  if (data.serviceCharge) {
    addLine(formatKV(`Svc Charge (${data.serviceCharge.percent}%):`, data.serviceCharge.amount.toFixed(2)));
  }

  // Total (bold + double height)
  addCmd(CMD.BOLD_ON);
  addCmd(CMD.DOUBLE_HEIGHT);
  addLine(formatKV("TOTAL:", data.total.toFixed(2)));
  addCmd(CMD.NORMAL_SIZE);
  addCmd(CMD.BOLD_OFF);

  // Payment info
  addEmpty();
  addLine(formatKV("Payment:", data.paymentMethod.toUpperCase()));
  if (data.cashReceived !== undefined) {
    addLine(formatKV("Received:", data.cashReceived.toFixed(2)));
  }
  if (data.change !== undefined && data.change > 0) {
    addLine(formatKV("Change:", data.change.toFixed(2)));
  }

  // Footer (centered)
  addCmd(CMD.ALIGN_CENTER);
  addLine(divider());
  if (data.isReprint) {
    addLine("*** REPRINT COPY ***");
  }
  addLine("THIS IS NOT A VALID");
  addLine("OFFICIAL RECEIPT.");
  addLine("Manual OR will be issued.");
  addLine(divider());
  addLine("Thank you!");

  // Feed and cut
  addCmd(CMD.FEED_3);
  addCmd(CMD.CUT);

  return concat(...parts);
}

/**
 * Build plain text version of receipt (for PDF / display)
 */
export function buildReceiptText(data: ReceiptData): string {
  const lines: string[] = [];

  if (data.isReprint) {
    lines.push(center("*** REPRINT COPY ***"));
    lines.push("");
  }

  lines.push(center(data.storeName || "FIFTH D FRIED CHICKEN KIOSK"));
  if (data.branchName) lines.push(center(data.branchName));
  lines.push(divider());
  lines.push(center("ORDER SLIP"));
  lines.push(center("NOT OFFICIAL RECEIPT"));
  lines.push(divider());
  lines.push(formatKV("Slip #:", data.orderSlipNumber || data.orderNumber || ""));
  lines.push(formatKV("Date :", data.date));
  lines.push(formatKV("Time :", data.time));
  lines.push(formatKV("Cash :", data.cashier));
  lines.push(divider());

  for (const item of data.items) {
    lines.push(formatItemLine(item.qty, item.name, item.amount));
    if (item.discountLabel) {
      lines.push("   " + item.discountLabel.substring(0, 29));
    }
    if (item.idNumber) {
      lines.push("   ID: " + item.idNumber.substring(0, 25));
    }
  }
  lines.push(divider());
  lines.push(formatKV("Subtotal:", data.subtotal.toFixed(2)));

  // Service charge
  if (data.serviceCharge) {
    lines.push(formatKV(`Svc Charge (${data.serviceCharge.percent}%):`, data.serviceCharge.amount.toFixed(2)));
  }

  lines.push("");
  lines.push(formatKV("TOTAL:", data.total.toFixed(2)));
  lines.push("");
  lines.push(formatKV("Payment:", data.paymentMethod.toUpperCase()));
  if (data.cashReceived !== undefined) lines.push(formatKV("Received:", data.cashReceived.toFixed(2)));
  if (data.change !== undefined && data.change > 0) lines.push(formatKV("Change:", data.change.toFixed(2)));

  lines.push(divider());
  lines.push(center("THIS IS NOT A VALID"));
  lines.push(center("OFFICIAL RECEIPT."));
  lines.push(center("Manual OR will be issued."));
  lines.push(divider());
  lines.push(center("Thank you!"));

  return lines.join("\n");
}
