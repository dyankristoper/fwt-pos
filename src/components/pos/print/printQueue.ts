/**
 * Non-blocking print queue for thermal printing
 * Ensures UI never freezes during print operations
 */

import { bluetoothPrinter } from './bluetoothPrinter';

export interface PrintJob {
  id: string;
  data: Uint8Array;
  copies: number;
  status: 'pending' | 'printing' | 'done' | 'failed';
  error?: string;
}

type QueueCallback = (jobs: PrintJob[]) => void;

const INTER_COPY_DELAY = 300; // ms between copies
const RETRY_DELAY = 500; // ms for buffer overflow retry

class PrintQueueService {
  private queue: PrintJob[] = [];
  private processing = false;
  private callbacks: Set<QueueCallback> = new Set();

  onQueueChange(cb: QueueCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  private notify() {
    this.callbacks.forEach(cb => cb([...this.queue]));
  }

  enqueue(data: Uint8Array, copies = 3): string {
    const id = `pj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.queue.push({ id, data, copies, status: 'pending' });
    this.notify();
    this.processQueue(); // fire-and-forget
    return id;
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.some(j => j.status === 'pending')) {
      const job = this.queue.find(j => j.status === 'pending');
      if (!job) break;

      job.status = 'printing';
      this.notify();

      if (!bluetoothPrinter.status.connected) {
        job.status = 'failed';
        job.error = 'Printer not connected';
        this.notify();
        continue;
      }

      let success = true;
      for (let copy = 0; copy < job.copies; copy++) {
        const result = await bluetoothPrinter.sendBytes(job.data);
        if (!result) {
          // Retry once after delay (buffer overflow handling)
          await new Promise(r => setTimeout(r, RETRY_DELAY));
          const retry = await bluetoothPrinter.sendBytes(job.data);
          if (!retry) {
            success = false;
            break;
          }
        }
        if (copy < job.copies - 1) {
          await new Promise(r => setTimeout(r, INTER_COPY_DELAY));
        }
      }

      job.status = success ? 'done' : 'failed';
      if (!success) job.error = 'Print failed after retry';
      this.notify();
    }

    // Clean completed jobs after 5 seconds
    setTimeout(() => {
      this.queue = this.queue.filter(j => j.status !== 'done');
      this.notify();
    }, 5000);

    this.processing = false;
  }
}

export const printQueue = new PrintQueueService();
