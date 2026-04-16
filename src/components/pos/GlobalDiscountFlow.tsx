import { useState, useEffect, useMemo } from 'react';
import { ItemDiscount } from './types';
import { ArrowLeft, ShieldCheck, Percent, Hash, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DbDiscountType {
  id: string;
  discount_code: string;
  discount_name: string;
  discount_percent: number;
  scope: string;
  discount_type: string;
  is_vat_exempt: boolean;
  requires_customer_name: boolean;
  requires_promo_code: boolean;
  promo_code_value: string | null;
  requires_note: boolean;
}

interface GlobalDiscountFlowProps {
  orderSubtotal: number;
  existingDiscount?: ItemDiscount | null;
  onApply: (discount: ItemDiscount) => void;
  onRemove: () => void;
  onClose: () => void;
}

type Step = 'select' | 'details' | 'pin' | 'confirm';

const GlobalDiscountFlow = ({ orderSubtotal, existingDiscount, onApply, onRemove, onClose }: GlobalDiscountFlowProps) => {
  const [step, setStep] = useState<Step>(existingDiscount ? 'details' : 'select');
  const [discountTypes, setDiscountTypes] = useState<DbDiscountType[]>([]);
  const [selectedType, setSelectedType] = useState<DbDiscountType | null>(null);
  const [loading, setLoading] = useState(true);

  const [customValue, setCustomValue] = useState(existingDiscount?.value?.toString() ?? '');
  const [customerName, setCustomerName] = useState(existingDiscount?.customer_name ?? '');
  const [promoCode, setPromoCode] = useState('');
  const [note, setNote] = useState(existingDiscount?.reason ?? '');

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [approverName, setApproverName] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('discount_types')
        .select('*')
        .eq('is_active', true)
        .eq('scope', 'GLOBAL_ORDER')
        .order('discount_name');
      if (data) setDiscountTypes(data as unknown as DbDiscountType[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (existingDiscount?.discount_id && discountTypes.length > 0) {
      const match = discountTypes.find(d => d.id === existingDiscount.discount_id);
      if (match) setSelectedType(match);
    }
  }, [existingDiscount, discountTypes]);

  const discType = selectedType?.discount_type === 'FIXED' ? 'fixed' : 'percent';

  const discountValue = useMemo(() => {
    if (!selectedType) return parseFloat(customValue) || 0;
    return selectedType.discount_percent > 0 ? selectedType.discount_percent : (parseFloat(customValue) || 0);
  }, [selectedType, customValue]);

  const discountAmount = useMemo(() => {
    if (discType === 'percent') {
      return Math.round(orderSubtotal * Math.min(discountValue, 100) / 100 * 100) / 100;
    }
    return Math.min(discountValue, orderSubtotal);
  }, [orderSubtotal, discountValue, discType]);

  const finalTotal = Math.max(0, orderSubtotal - discountAmount);

  const handleSelectType = (dt: DbDiscountType) => {
    setSelectedType(dt);
    setCustomValue(String(dt.discount_percent));
    setCustomerName('');
    setPromoCode('');
    setNote('');
    setStep('details');
  };

  const validateDetails = (): boolean => {
    if (!selectedType) return false;
    if (selectedType.requires_customer_name && !customerName.trim()) {
      toast.error('Customer name is required');
      return false;
    }
    if (selectedType.requires_promo_code) {
      if (!promoCode.trim()) {
        toast.error('Promo code is required');
        return false;
      }
      if (selectedType.promo_code_value && promoCode.trim().toUpperCase() !== selectedType.promo_code_value.toUpperCase()) {
        toast.error('Invalid promo code');
        return false;
      }
    }
    if (selectedType.requires_note && !note.trim()) {
      toast.error('A note/reason is required');
      return false;
    }
    if (discountValue <= 0) {
      toast.error('Enter a valid discount value');
      return false;
    }
    return true;
  };

  const handleDetailsNext = () => {
    if (validateDetails()) setStep('pin');
  };

  const handlePinSubmit = async () => {
    const { data } = await supabase
      .from('supervisors')
      .select('name')
      .eq('pin', pin)
      .eq('is_active', true)
      .limit(1);

    const sups = data as unknown as { name: string }[] | null;
    if (sups && sups.length > 0) {
      setPinError(false);
      setApproverName(sups[0].name);
      setStep('confirm');
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const handleConfirm = () => {
    if (!selectedType) return;
    const discount: ItemDiscount = {
      type: discType,
      value: discountValue,
      reason: note.trim() || selectedType.discount_name,
      discount_id: selectedType.id,
      discount_name: selectedType.discount_name,
      discount_code: selectedType.discount_code,
      customer_name: customerName.trim() || undefined,
      promo_code_used: promoCode.trim() || undefined,
      approved_by: approverName,
      is_vat_exempt: selectedType.is_vat_exempt,
    };
    onApply(discount);
  };

  // ─── STEP: Select ───
  if (step === 'select') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={onClose} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-display text-lg font-bold text-foreground">Order Discount</h2>
          </div>

          <div className="bg-foreground/5 rounded-xl p-3 mb-4">
            <p className="font-display font-bold text-sm text-foreground">Order Subtotal</p>
            <p className="font-body text-xs text-foreground/50">₱{orderSubtotal.toFixed(2)} after item discounts</p>
          </div>

          {loading ? (
            <div className="text-center py-8 text-foreground/40 font-display text-sm">Loading discounts...</div>
          ) : discountTypes.length === 0 ? (
            <div className="text-center py-8 text-foreground/30">
              <Tag size={32} className="mx-auto mb-2" />
              <p className="font-display text-sm font-semibold">No order-level discounts configured</p>
              <p className="text-xs text-foreground/40 mt-1">Add discounts in Supervisor → Settings</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {discountTypes.map(dt => (
                <button
                  key={dt.id}
                  onClick={() => handleSelectType(dt)}
                  className="w-full bg-background rounded-xl border border-foreground/10 p-3 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display font-bold text-sm text-foreground">{dt.discount_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-foreground/45">
                        <span className="flex items-center gap-0.5">
                          {dt.discount_type === 'PERCENT' ? <Percent size={10} /> : <Hash size={10} />}
                          {dt.discount_percent}{dt.discount_type === 'PERCENT' ? '%' : '₱'}
                        </span>
                        {dt.is_vat_exempt && <span className="text-accent font-semibold">VAT-Exempt</span>}
                        {dt.requires_promo_code && <span>Promo Code</span>}
                      </div>
                    </div>
                    <ShieldCheck size={16} className="text-foreground/20 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {existingDiscount && (
            <button
              onClick={onRemove}
              className="w-full mt-3 h-11 border-2 border-accent/30 text-accent rounded-xl font-display font-semibold text-sm active:scale-[0.97] transition-transform"
            >
              Remove Order Discount
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── STEP: Details ───
  if (step === 'details' && selectedType) {
    const needsCustomValue = selectedType.discount_percent <= 0;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setStep('select')} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-display text-lg font-bold text-foreground">{selectedType.discount_name}</h2>
          </div>

          <div className="bg-foreground/5 rounded-xl p-3 mb-4">
            <p className="font-display font-bold text-sm text-foreground">Order Subtotal</p>
            <p className="font-body text-xs text-foreground/50">₱{orderSubtotal.toFixed(2)}</p>
          </div>

          <div className="space-y-3 mb-4">
            {needsCustomValue && (
              <div>
                <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">
                  {discType === 'percent' ? 'Discount %' : 'Discount Amount (₱)'} *
                </label>
                <input type="number" value={customValue} onChange={e => setCustomValue(e.target.value)}
                  min="0" max={discType === 'percent' ? '100' : String(orderSubtotal)}
                  className="w-full h-12 mt-1 px-4 bg-background border-2 border-foreground/10 rounded-xl font-display text-xl text-foreground focus:border-accent focus:outline-none transition-colors text-center"
                  placeholder={discType === 'percent' ? '10' : '50.00'} autoFocus />
              </div>
            )}

            {selectedType.requires_customer_name && (
              <div>
                <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Customer Name *</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} maxLength={100}
                  className="w-full h-11 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-xl font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors"
                  placeholder="Full name" autoFocus={!needsCustomValue} />
              </div>
            )}

            {selectedType.requires_promo_code && (
              <div>
                <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Promo Code *</label>
                <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)} maxLength={50}
                  className="w-full h-11 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-xl font-display text-sm text-foreground focus:border-accent focus:outline-none transition-colors uppercase"
                  placeholder="Enter promo code" />
              </div>
            )}

            {selectedType.requires_note && (
              <div>
                <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Note / Reason *</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={200} rows={2}
                  className="w-full mt-1 px-3 py-2 bg-background border-2 border-foreground/10 rounded-xl font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors resize-none"
                  placeholder="Reason for discount..." />
              </div>
            )}
          </div>

          {discountValue > 0 && (
            <div className="bg-foreground/5 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-foreground/50 uppercase tracking-wide">Order Total After Discount</p>
              <p className="font-display text-2xl font-bold text-foreground">₱{finalTotal.toFixed(2)}</p>
              <p className="text-xs text-accent font-display font-semibold">
                -{discType === 'percent' ? `${discountValue}%` : `₱${discountValue.toFixed(2)}`} (−₱{discountAmount.toFixed(2)})
              </p>
            </div>
          )}

          <button onClick={handleDetailsNext}
            className="w-full h-13 bg-pos-gold text-primary rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform disabled:opacity-30"
          >
            Next — Supervisor Approval
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: Supervisor PIN ───
  if (step === 'pin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setStep('details')} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-display text-lg font-bold text-foreground">Supervisor Approval</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Enter supervisor PIN to authorize <strong>{selectedType?.discount_name}</strong> discount on entire order
          </p>
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false); }}
            maxLength={8}
            className={`w-full h-14 px-4 bg-background border-2 rounded-xl font-display text-2xl text-center tracking-[0.5em] text-foreground focus:outline-none transition-colors ${
              pinError ? 'border-accent' : 'border-foreground/10 focus:border-pos-gold'
            }`}
            placeholder="••••"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && pin.trim() && handlePinSubmit()}
          />
          {pinError && <p className="text-accent text-xs font-display font-semibold mt-2 text-center">Incorrect PIN. Try again.</p>}
          <button onClick={handlePinSubmit} disabled={!pin.trim()}
            className="w-full mt-5 h-13 bg-pos-gold text-primary rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform disabled:opacity-30">
            Authorize
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: Confirm ───
  if (step === 'confirm' && selectedType) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
          <h2 className="font-display text-lg font-bold text-foreground text-center mb-1 flex items-center justify-center gap-2">
            <ShieldCheck size={20} className="text-pos-gold-dark" />
            Confirm Order Discount
          </h2>
          <p className="text-center text-muted-foreground text-xs mb-4">
            Approved by: {approverName}
          </p>

          <div className="bg-background rounded-xl border-2 border-foreground/10 p-4 mb-4 font-mono text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-foreground/60">Discount</span>
              <span className="font-bold text-foreground">{selectedType.discount_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Subtotal</span>
              <span className="font-bold text-foreground">₱{orderSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Less Discount</span>
              <span className="font-bold text-accent">−₱{discountAmount.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-dashed border-foreground/15 pt-1.5 flex justify-between">
              <span className="font-bold text-foreground">New Total</span>
              <span className="font-bold text-xl text-foreground">₱{finalTotal.toFixed(2)}</span>
            </div>
            {customerName && (
              <div className="flex justify-between text-xs">
                <span className="text-foreground/50">Customer</span>
                <span className="text-foreground">{customerName}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 h-12 border-2 border-foreground/15 text-foreground/50 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform">
              Cancel
            </button>
            <button onClick={handleConfirm}
              className="flex-[2] h-12 bg-pos-gold text-primary rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform">
              Apply Discount
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GlobalDiscountFlow;
