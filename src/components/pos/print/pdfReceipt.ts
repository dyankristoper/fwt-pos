/**
 * PDF Receipt Generator
 * Creates a monospaced 58mm-equivalent PDF matching thermal layout
 */

import { buildReceiptText, ReceiptData } from './escpos';

const CHAR_WIDTH = 7.2;   // px per character in monospace
const LINE_HEIGHT = 16;   // px per line
const PADDING = 12;        // px padding
const PAPER_WIDTH_MM = 58;
const PAPER_WIDTH_PX = 32 * CHAR_WIDTH + PADDING * 2; // ~243px

/**
 * Render receipt text to a canvas and return as data URL
 */
export function renderReceiptToCanvas(data: ReceiptData): HTMLCanvasElement {
  const text = buildReceiptText(data);
  const lines = text.split('\n');

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(PAPER_WIDTH_PX);
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

/**
 * Generate filename for receipt PDF/image
 */
export function generateReceiptFilename(orderNumber: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  return `FWC-${orderNumber}-${date}-${time}`;
}

/**
 * Download receipt as PNG image
 */
export function downloadReceiptImage(data: ReceiptData): void {
  const canvas = renderReceiptToCanvas(data);
  const filename = generateReceiptFilename(data.orderNumber);

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Save receipt as blob (for saving to filesystem on Android)
 */
export function getReceiptBlob(data: ReceiptData): Promise<Blob> {
  const canvas = renderReceiptToCanvas(data);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
}
