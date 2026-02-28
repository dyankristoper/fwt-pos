import { useState, useCallback } from 'react';
import { ReceiptData } from './print/escpos';
import { InvoiceData } from './generateInvoice';
import { renderReceiptToCanvas, generateReceiptFilename } from './print/pdfReceipt';
import { renderInvoiceToCanvas } from './generateInvoice';
import { shareCanvasAsPNG } from '@/utils/shareFile';
import { Printer, X, Check, Loader2 } from 'lucide-react';

interface ManualPrintModalProps {
  receiptData: ReceiptData;
  invoiceData: InvoiceData;
  onClose: () => void;
}

type PrintStatus = 'idle' | 'printing' | 'done' | 'error';

const COPY_LABELS = ['KITCHEN', 'COUNTER', 'CUSTOMER'] as const;

const ManualPrintModal = ({ receiptData, invoiceData, onClose }: ManualPrintModalProps) => {
  const [copyStatus, setCopyStatus] = useState<Record<string, PrintStatus>>({
    KITCHEN: 'idle',
    COUNTER: 'idle',
    CUSTOMER: 'idle',
    INVOICE: 'idle',
  });
  const [busy, setBusy] = useState(false);

  const handlePrintCopy = useCallback(async (label: typeof COPY_LABELS[number], copyIndex: number) => {
    if (busy) return;
    setBusy(true);
    setCopyStatus(prev => ({ ...prev, [label]: 'printing' }));

    try {
      const data: ReceiptData = { ...receiptData, copyLabel: label };
      const canvas = renderReceiptToCanvas(data);
      const filename = generateReceiptFilename(
        data.orderSlipNumber || data.orderNumber || '',
        label
      );
      await shareCanvasAsPNG(canvas, `${filename}.png`);
      setCopyStatus(prev => ({ ...prev, [label]: 'done' }));
    } catch (err) {
      console.error(`Print ${label} failed:`, err);
      setCopyStatus(prev => ({ ...prev, [label]: 'error' }));
    } finally {
      setBusy(false);
    }
  }, [busy, receiptData]);

  const handlePrintInvoice = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setCopyStatus(prev => ({ ...prev, INVOICE: 'printing' }));

    try {
      const canvas = renderInvoiceToCanvas(invoiceData);
      const controlStr = String(invoiceData.controlNumber).padStart(6, '0');
      const filename = `InternalSI-SI-${controlStr}.png`;
      await shareCanvasAsPNG(canvas, filename);
      setCopyStatus(prev => ({ ...prev, INVOICE: 'done' }));
    } catch (err) {
      console.error('Print invoice failed:', err);
      setCopyStatus(prev => ({ ...prev, INVOICE: 'error' }));
    } finally {
      setBusy(false);
    }
  }, [busy, invoiceData]);

  const statusIcon = (status: PrintStatus) => {
    switch (status) {
      case 'printing': return <Loader2 size={18} className="animate-spin" />;
      case 'done': return <Check size={18} className="text-green-400" />;
      case 'error': return <span className="text-red-400 text-xs font-bold">!</span>;
      default: return <Printer size={18} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-foreground/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-foreground/10 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">Print Copies</h2>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg bg-foreground/10 flex items-center justify-center text-foreground/60 active:scale-95 transition-transform"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground font-body mb-4">
            Tap each button one at a time. Tear paper between prints.
          </p>

          {COPY_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => handlePrintCopy(label, i + 1)}
              disabled={busy}
              className={`w-full h-14 rounded-xl font-display font-semibold text-sm flex items-center justify-between px-5 transition-all active:scale-[0.98] ${
                copyStatus[label] === 'done'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : copyStatus[label] === 'error'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-primary/20 text-primary-foreground border border-primary/30'
              } disabled:opacity-50`}
            >
              <span>Print Copy {i + 1} — {label}</span>
              {statusIcon(copyStatus[label])}
            </button>
          ))}

          <div className="border-t border-foreground/10 pt-3 mt-3">
            <button
              onClick={handlePrintInvoice}
              disabled={busy}
              className={`w-full h-14 rounded-xl font-display font-semibold text-sm flex items-center justify-between px-5 transition-all active:scale-[0.98] ${
                copyStatus.INVOICE === 'done'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : copyStatus.INVOICE === 'error'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-accent/20 text-accent border border-accent/30'
              } disabled:opacity-50`}
            >
              <span>Print Sales Invoice</span>
              {statusIcon(copyStatus.INVOICE)}
            </button>
          </div>
        </div>

        <div className="p-5 border-t border-foreground/10">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-foreground/10 text-foreground font-display font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualPrintModal;
