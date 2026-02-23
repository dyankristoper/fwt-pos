import { useState, useEffect, useMemo } from 'react';
import { OrderItem, ItemDiscount } from './types';
import { calculateItemTotal } from './useOrderState';
import { ArrowLeft, Tag, ShieldCheck, Percent, Hash } from 'lucide-react';
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
  requires_id_number: boolean;
  id_type: string | null;
  requires_customer_name: boolean;
  requires_promo_code: boolean;
  promo_code_value: string | null;
  requires_note: boolean;
}

interface ItemDiscountFlowProps {
  item: OrderItem;
  onApply: (instanceId: string, discount: ItemDiscount) => void;
  onRemove: (instanceId: string) => void;
  onClose: () => void;
}

type Step = 'select' | 'details' | 'pin' | 'confirm';

const ItemDiscountFlow = ({ item, onApply, onRemove, onClose }: ItemDiscountFlowProps) => {
  const [step, setStep] = useState<Step>(item.discount ? 'details' : 'select');
  const [discountTypes, setDiscountTypes] = useState<DbDiscountType[]>([]);
  const [selectedType, setSelectedType] = useState<DbDiscountType | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [customValue, setCustomValue] = useState(item.discount?.value?.toString() ?? '');
  const [idNumber, setIdNumber] = useState(item.discount?.id_number ?? '');
  const [customerName, setCustomerName] = useState(item.discount?.customer_name ?? '');
  const [promoCode, setPromoCode] = useState('');
  const [note, setNote] = useState(item.discount?.reason ?? '');

  // PIN
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [approverName, setApproverName] = useState('');

  const itemTotal = calculateItemTotal(item);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('discount_types')
        .select('*')
        .eq('is_active', true)
        .eq('scope', 'LINE_ITEM')
        .order('discount_name');
      if (data) setDiscountTypes(data as unknown as DbDiscountType[]);
      setLoading(false);
    })();
  }, []);

  // If editing existing discount, try to match to a DB type
  useEffect(() => {
    if (item.discount?.discount_id && discountTypes.length > 0) {
      const match = discountTypes.find(d => d.id === item.discount!.discount_id);
      if (match) setSelectedType(match);
    }
  }, [item.discount, discountTypes]);

  const discountValue = useMemo(() => {
    if (!selectedType) return parseFloat(customValue) || 0;
    // Use the configured value from DB, but allow custom if type is FIXED
    return selectedType.discount_percent > 0 ? selectedType.discount_percent : (parseFloat(customValue) || 0);
  }, [selectedType, customValue]);

  const discType = selectedType?.discount_type === 'FIXED' ? 'fixed' : 'percent';

  const discountAmount = useMemo(() => {
    if (discType === 'percent') {
      return Math.round(itemTotal * Math.min(discountValue, 100) / 100 * 100) / 100;
    }
    return Math.min(discountValue, itemTotal);
  }, [itemTotal, discountValue, discType]);

  const finalAmount = Math.max(0, itemTotal - discountAmount);

  const handleSelectType = (dt: DbDiscountType) => {
    setSelectedType(dt);
    setCustomValue(String(dt.discount_percent));
    setIdNumber('');
    setCustomerName('');
    setPromoCode('');
    setNote('');
    setStep('details');
  };

  const validateDetails = (): boolean => {
    if (!selectedType) return false;

    if (selectedType.requires_id_number && !idNumber.trim()) {
      toast.error(`${selectedType.id_type || 'ID number'} is required`);
      return false;
    }
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
    if (discType === 'percent' && discountValue > 100) {
      toast.error('Percentage cannot exceed 100%');
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
      id_number: idNumber.trim() || undefined,
      id_type: selectedType.id_type || undefined,
      customer_name: customerName.trim() || undefined,
      promo_code_used: promoCode.trim() || undefined,
      approved_by: approverName,
      is_vat_exempt: selectedType.is_vat_exempt,
    };
    onApply(item.instanceId, discount);
  };

  // ─── STEP: Select discount type ───
  if (step === 'select') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={onClose} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-display text-lg font-bold text-foreground">Select Discount</h2>
          </div>

          {/* Item info */}
          <div className="bg-foreground/5 rounded-xl p-3 mb-4">
            <p className="font-display font-bold text-sm text-foreground">{item.menuItem.name}</p>
            <p className="font-body text-xs text-foreground/50">
              Qty: {item.quantity} · Line total: ₱{itemTotal.toFixed(2)}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8 text-foreground/40 font-display text-sm">Loading discounts...</div>
          ) : discountTypes.length === 0 ? (
            <div className="text-center py-8 text-foreground/30">
              <Tag size={32} className="mx-auto mb-2" />
              <p className="font-display text-sm font-semibold">No line-item discounts configured</p>
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
                        {dt.requires_id_number && <span>ID Required</span>}
                        {dt.requires_promo_code && <span>Promo Code</span>}
                      </div>
                    </div>
                    <ShieldCheck size={16} className="text-foreground/20 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Existing discount: allow remove */}
          {item.discount && (
            <button
              onClick={() => onRemove(item.instanceId)}
              className="w-full mt-3 h-11 border-2 border-accent/30 text-accent rounded-xl font-display font-semibold text-sm active:scale-[0.97] transition-transform"
            >
              Remove Current Discount
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── STEP: Details / required fields ───
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

          {/* Item info */}
          <div className="bg-foreground/5 rounded-xl p-3 mb-4">
            <p className="font-display font-bold text-sm text-foreground">{item.menuItem.name}</p>
            <p className="font-body text-xs text-foreground/50">
              Qty: {item.quantity} · Line total: ₱{itemTotal.toFixed(2)}
            </p>
          </div>

          <div className="space-y-3 mb-4">
            {/* Custom value input if DB value is 0 */}
            {needsCustomValue && (
              <div>
                <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">
                  {discType === 'percent' ? 'Discount %' : 'Discount Amount (₱)'} *
                </label>
                <input type="number" value={customValue} onChange={e => setCustomValue(e.target.value)}
                  min="0" max={discType === 'percent' ? '100' : String(itemTotal)}
                  className="w-full h-12 mt-1 px-4 bg-background border-2 border-foreground/10 rounded-xl font-display text-xl text-foreground focus:border-accent focus:outline-none transition-colors text-center"
                  placeholder={discType === 'percent' ? '10' : '50.00'} autoFocus />
              </div>
            )}

            {/* Customer name */}
            {selectedType.requires_customer_name && (
              <div>
                <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Customer Name *</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} maxLength={100}
                  className="w-full h-11 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-xl font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors"
                  placeholder="Full name" autoFocus={!needsCustomValue} />
              </div>
            )}

            {/* ID number */}
            {selectedType.requires_id_number && (
              <div>
                <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">
                  {selectedType.id_type || 'ID Number'} *
                </label>
                <input type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)} maxLength={50}
                  className="w-full h-11 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-xl font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors"
                  placeholder="ID Number" />
              </div>
            )}

            {/* Promo code */}
            {selectedType.requires_promo_code && (
              <div>
                <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Promo Code *</label>
                <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)} maxLength={50}
                  className="w-full h-11 mt-1 px-3 bg-background border-2 border-foreground/10 rounded-xl font-display text-sm text-foreground focus:border-accent focus:outline-none transition-colors uppercase"
                  placeholder="Enter promo code" />
              </div>
            )}

            {/* Note */}
            {selectedType.requires_note && (
              <div>
                <label className="font-display text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">Note / Reason *</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={200} rows={2}
                  className="w-full mt-1 px-3 py-2 bg-background border-2 border-foreground/10 rounded-xl font-body text-sm text-foreground focus:border-accent focus:outline-none transition-colors resize-none"
                  placeholder="Reason for discount..." />
              </div>
            )}
          </div>

          {/* Preview */}
          {discountValue > 0 && (
            <div className="bg-foreground/5 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-foreground/50 uppercase tracking-wide">After Discount</p>
              <p className="font-display text-2xl font-bold text-foreground">₱{finalAmount.toFixed(2)}</p>
              <p className="text-xs text-accent font-display font-semibold">
                -{discType === 'percent' ? `${discountValue}%` : `₱${discountValue.toFixed(2)}`} (−₱{discountAmount.toFixed(2)})
              </p>
              {selectedType.is_vat_exempt && (
                <p className="text-[10px] text-accent/70 mt-1">VAT-Exempt applies</p>
              )}
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
        <div className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setStep('details')} className="text-foreground/40 active:text-foreground p-1">
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-display text-lg font-bold text-foreground">Supervisor Approval</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Enter supervisor PIN to authorize <strong>{selectedType?.discount_name}</strong> discount
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
        <div className="bg-card rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <h2 className="font-display text-lg font-bold text-foreground text-center mb-1 flex items-center justify-center gap-2">
            <ShieldCheck size={20} className="text-pos-gold-dark" />
            Confirm Discount
          </h2>
          <p className="text-center text-muted-foreground text-xs mb-4">
            Approved by: {approverName}
          </p>

          <div className="bg-background rounded-xl border-2 border-foreground/10 p-4 mb-4 font-mono text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-foreground/60">Item</span>
              <span className="font-bold text-foreground">{item.menuItem.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Discount</span>
              <span className="font-bold text-foreground">{selectedType.discount_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Line Total</span>
              <span className="font-bold text-foreground">₱{itemTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Less Discount</span>
              <span className="font-bold text-accent">−₱{discountAmount.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-dashed border-foreground/15 pt-1.5 flex justify-between">
              <span className="font-bold text-foreground">After Discount</span>
              <span className="font-bold text-xl text-foreground">₱{finalAmount.toFixed(2)}</span>
            </div>
            {customerName && (
              <div className="flex justify-between text-xs">
                <span className="text-foreground/50">Customer</span>
                <span className="text-foreground">{customerName}</span>
              </div>
            )}
            {idNumber && (
              <div className="flex justify-between text-xs">
                <span className="text-foreground/50">{selectedType.id_type || 'ID'}</span>
                <span className="text-foreground">{idNumber}</span>
              </div>
            )}
          </div>

          {selectedType.is_vat_exempt && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-2.5 mb-4 text-[10px] text-accent leading-relaxed text-center">
              THIS IS NOT A VALID OFFICIAL RECEIPT.<br />
              A BIR-REGISTERED MANUAL RECEIPT WILL BE ISSUED.
            </div>
          )}

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

export default ItemDiscountFlow;
