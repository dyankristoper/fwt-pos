import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, AlertTriangle, RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CompletedOrder } from './types';
import { calculateItemTotal } from './useOrderState';

interface VoidRefundFlowProps {
  order: CompletedOrder;
  onComplete: (order: CompletedOrder, type: 'void' | 'refund') => void;
  onCancel: () => void;
}

type Step = 'select' | 'reason' | 'pin' | 'confirm';
type ActionType = 'void' | 'refund';

const VOID_REASONS = [
  'Customer changed mind',
  'Wrong order entered',
  'Item unavailable',
  'Duplicate entry',
  'System error',
  'Other',
];

const VoidRefundFlow = ({ order, onComplete, onCancel }: VoidRefundFlowProps) => {
  const [step, setStep] = useState<Step>('select');
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [saving, setSaving] = useState(false);

  const finalReason = reason === 'Other' ? customReason.trim() : reason;

  const handleSelectType = (type: ActionType) => {
    setActionType(type);
    setStep('reason');
  };

  const handleReasonSubmit = () => {
    if (!finalReason) {
      toast.error('Please select or enter a reason');
      return;
    }
    setStep('pin');
  };

  const handlePinSubmit = async () => {
    // Validate PIN against supervisors table
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

  const handleConfirm = async () => {
    if (!actionType) return;
    setSaving(true);

    try {
      const itemsJson = order.items.map(item => ({
        name: item.menuItem.name,
        qty: item.quantity,
        price: item.menuItem.price,
        total: calculateItemTotal(item),
        isCombo: item.isCombo,
      }));

      await supabase.from('void_refund_log').insert({
        original_sale_id: order.id,
        type: actionType,
        reason: finalReason,
        items_json: itemsJson,
        original_amount: order.total,
        refund_amount: actionType === 'refund' ? order.total : 0,
        approved_by: approverName,
        processed_by: 'CASHIER',
      });

      toast.success(
        actionType === 'void'
          ? `Order ${order.id} voided successfully`
          : `Refund ₱${order.total.toFixed(2)} processed for ${order.id}`
      );
      onComplete(order, actionType);
    } catch {
      toast.error('Failed to process — try again');
    } finally {
      setSaving(false);
    }
  };

  const actionLabel = actionType === 'void' ? 'Void' : 'Refund';
  const actionIcon = actionType === 'void' ? <XCircle size={20} /> : <RotateCcw size={20} />;

  // Step: Select void or refund
  if (step === 'select') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle size={22} className="text-accent" />
            <h2 className="font-display text-xl font-bold text-foreground">Void / Refund</h2>
          </div>

          <div className="bg-foreground/5 rounded-xl p-4 mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-foreground/50 uppercase">Order</span>
              <span className="font-display font-bold text-sm text-foreground">{order.id}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-foreground/50 uppercase">Amount</span>
              <span className="font-display font-bold text-foreground">₱{order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-foreground/50 uppercase">Payment</span>
              <span className="font-display font-semibold text-sm text-foreground capitalize">{order.paymentMethod}</span>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <button onClick={() => handleSelectType('void')}
              className="w-full h-16 bg-accent text-accent-foreground rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform flex items-center justify-center gap-3">
              <XCircle size={22} />
              Void Transaction
            </button>
            <button onClick={() => handleSelectType('refund')}
              className="w-full h-16 bg-primary text-primary-foreground rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform flex items-center justify-center gap-3">
              <RotateCcw size={22} />
              Process Refund
            </button>
          </div>

          <button onClick={onCancel} className="w-full h-11 text-foreground/40 font-display font-semibold active:scale-[0.97] transition-transform">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Step: Select reason
  if (step === 'reason') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setStep('select')} className="text-foreground/40 active:text-foreground p-1"><ArrowLeft size={20} /></button>
            <h2 className="font-display text-xl font-bold text-foreground">{actionLabel} Reason</h2>
          </div>

          <div className="space-y-2 mb-4">
            {VOID_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full h-12 px-4 rounded-xl font-display font-semibold text-sm text-left active:scale-[0.97] transition-all border-2 ${
                  reason === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground border-foreground/10'
                }`}>
                {r}
              </button>
            ))}
          </div>

          {reason === 'Other' && (
            <textarea value={customReason} onChange={e => setCustomReason(e.target.value)} maxLength={200} rows={2}
              className="w-full px-4 py-3 bg-background border-2 border-foreground/10 rounded-xl font-body text-foreground text-sm focus:border-accent focus:outline-none transition-colors mb-4 resize-none"
              placeholder="Describe the reason..." autoFocus />
          )}

          <button onClick={handleReasonSubmit} disabled={!finalReason}
            className="w-full h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
            Next — Supervisor Approval
          </button>
        </div>
      </div>
    );
  }

  // Step: Supervisor PIN
  if (step === 'pin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setStep('reason')} className="text-foreground/40 active:text-foreground p-1"><ArrowLeft size={20} /></button>
            <h2 className="font-display text-xl font-bold text-foreground">Supervisor Approval</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Enter supervisor PIN to authorize <span className="font-semibold text-foreground">{actionLabel.toLowerCase()}</span> of {order.id}
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

  // Step: Confirm
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          <h2 className="font-display text-xl font-bold text-foreground text-center mb-1 flex items-center justify-center gap-2">
            {actionIcon}
            Confirm {actionLabel}
          </h2>
          <p className="text-center text-muted-foreground text-xs mb-5">This action will be permanently logged</p>

          <div className="bg-background rounded-xl border-2 border-foreground/10 p-5 mb-4 font-mono text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-foreground/60">Order</span>
              <span className="font-bold text-foreground">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Action</span>
              <span className="font-bold text-accent uppercase">{actionType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Amount</span>
              <span className="font-bold text-foreground">₱{order.total.toFixed(2)}</span>
            </div>
            {actionType === 'refund' && (
              <div className="flex justify-between border-t-2 border-dashed border-foreground/15 pt-2">
                <span className="font-bold text-foreground">Refund Amount</span>
                <span className="font-bold text-2xl text-accent">₱{order.total.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="bg-foreground/5 rounded-lg p-3 mb-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-foreground/50">Reason</span>
              <span className="font-display font-semibold text-foreground text-right max-w-[60%]">{finalReason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/50">Approved by</span>
              <span className="font-display font-semibold text-foreground">{approverName}</span>
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-5 text-[11px] text-accent leading-relaxed text-center">
            <AlertTriangle size={14} className="inline mr-1" />
            This record cannot be deleted or modified after confirmation.
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 h-14 border-2 border-foreground/15 text-foreground/40 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform">
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={saving}
              className={`flex-[2] h-14 rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-50 ${
                actionType === 'void' ? 'bg-accent text-accent-foreground' : 'bg-pos-gold text-primary'
              }`}>
              {saving ? 'Processing...' : `Confirm ${actionLabel}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default VoidRefundFlow;
