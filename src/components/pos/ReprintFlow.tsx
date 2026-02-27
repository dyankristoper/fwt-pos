import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CompletedOrder } from './types';
import { logReprint } from './useSalesEngine';

interface ReprintFlowProps {
  order: CompletedOrder;
  onReprint: (order: CompletedOrder, isReprint: boolean) => void;
  onCancel: () => void;
}

const REPRINT_REASONS = [
  'Customer Lost Copy',
  'Printer Error',
  'Paper Jam',
  'Supervisor Request',
  'Audit Verification',
];

type Step = 'reason' | 'pin' | 'confirm';

const ReprintFlow = ({ order, onReprint, onCancel }: ReprintFlowProps) => {
  const [step, setStep] = useState<Step>('reason');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReasonSubmit = () => {
    if (!reason) { toast.error('Select a reason'); return; }
    setStep('pin');
  };

  const handlePinSubmit = async () => {
    const { data } = await supabase
      .from('supervisors')
      .select('name')
      .eq('pin', pin)
      .eq('is_active', true)
      .limit(1);

    const supervisors = data as unknown as { name: string }[] | null;
    if (supervisors && supervisors.length > 0) {
      setPinError(false);
      setApproverName(supervisors[0].name);
      setStep('confirm');
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const handleConfirm = useCallback(async () => {
    setSaving(true);
    try {
      await logReprint({
        slipNumber: order.orderSlipNumber,
        reason,
        note: note.trim() || undefined,
        supervisor: approverName,
      });
      toast.success(`Reprint logged for ${order.orderSlipNumber}`);
      onReprint(order, true);
    } catch {
      toast.error('Failed to log reprint');
    } finally {
      setSaving(false);
    }
  }, [order, reason, note, approverName, onReprint]);

  if (step === 'reason') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <Printer size={22} className="text-pos-gold" />
            <h2 className="font-display text-xl font-bold text-foreground">Reprint Order</h2>
          </div>

          <div className="bg-foreground/5 rounded-xl p-3 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground/50">Slip #</span>
              <span className="font-display font-bold text-foreground">{order.orderSlipNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/50">Total</span>
              <span className="font-display font-bold text-foreground">₱{order.total.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-muted-foreground text-xs mb-3">Select reprint reason:</p>
          <div className="space-y-2 mb-4">
            {REPRINT_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full h-11 px-4 rounded-xl font-display font-semibold text-sm text-left active:scale-[0.97] transition-all border-2 ${
                  reason === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground border-foreground/10'
                }`}>
                {r}
              </button>
            ))}
          </div>

          <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={200} rows={2}
            className="w-full px-4 py-3 bg-background border-2 border-foreground/10 rounded-xl font-body text-foreground text-sm focus:border-pos-gold focus:outline-none transition-colors mb-4 resize-none"
            placeholder="Optional note..." />

          <button onClick={handleReasonSubmit} disabled={!reason}
            className="w-full h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
            Next — Supervisor Approval
          </button>
          <button onClick={onCancel} className="w-full mt-2 h-11 text-foreground/40 font-display font-semibold">Cancel</button>
        </div>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setStep('reason')} className="text-foreground/40 active:text-foreground p-1"><ArrowLeft size={20} /></button>
            <h2 className="font-display text-xl font-bold text-foreground">Supervisor Approval</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Enter supervisor PIN to authorize reprint of {order.orderSlipNumber}
          </p>
          <input type="password" value={pin} onChange={e => { setPin(e.target.value); setPinError(false); }} maxLength={8}
            className={`w-full h-14 px-4 bg-background border-2 rounded-xl font-display text-2xl text-center tracking-[0.5em] text-foreground focus:outline-none transition-colors ${
              pinError ? 'border-accent' : 'border-foreground/10 focus:border-pos-gold'
            }`}
            placeholder="••••" autoFocus />
          {pinError && <p className="text-accent text-xs font-display font-semibold mt-2 text-center">Invalid supervisor PIN</p>}
          <button onClick={handlePinSubmit} disabled={!pin.trim()}
            className="w-full mt-6 h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
            Authorize
          </button>
        </div>
      </div>
    );
  }

  // Confirm
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold text-foreground text-center mb-4 flex items-center justify-center gap-2">
          <Printer size={20} /> Confirm Reprint
        </h2>

        <div className="bg-background rounded-xl border-2 border-foreground/10 p-5 mb-4 font-mono text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-foreground/60">Slip #</span>
            <span className="font-bold text-foreground">{order.orderSlipNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Reason</span>
            <span className="font-bold text-foreground">{reason}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Approved by</span>
            <span className="font-bold text-foreground">{approverName}</span>
          </div>
        </div>

        <div className="bg-pos-gold/10 border border-pos-gold/20 rounded-lg p-3 mb-5 text-[11px] text-pos-gold leading-relaxed text-center">
          <Printer size={14} className="inline mr-1" />
          Receipt will be labeled "REPRINT COPY". Slip number will NOT change.
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 h-14 border-2 border-foreground/15 text-foreground/40 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex-[2] h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-50">
            {saving ? 'Processing...' : 'Print Reprint Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReprintFlow;
