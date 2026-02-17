import { useState, useMemo } from 'react';
import { ShieldCheck, X, ArrowLeft, Copy, CheckCircle2, Percent, Tag, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VAT_RATE = 0.12;
const SUPERVISOR_PIN = '1234'; // TODO: Move to config/DB

export type DiscountType = 'SC' | 'PWD' | 'PROMO' | 'EMP';

export interface DiscountResult {
  discountType: DiscountType;
  customerName: string;
  idNumber: string;
  originalTotal: number;
  vatRemoved: number;
  vatExclusive: number;
  discountAmount: number;
  finalAmount: number;
  approvedBy: string;
  discountPercent: number;
}

interface DiscountFlowProps {
  total: number;
  saleId: string;
  onApplyDiscount: (result: DiscountResult) => void;
  onCancel: () => void;
}

type Step = 'select' | 'info' | 'promo-config' | 'pin' | 'breakdown';

const DiscountFlow = ({ total, saleId, onApplyDiscount, onCancel }: DiscountFlowProps) => {
  const [step, setStep] = useState<Step>('select');
  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [promoPercent, setPromoPercent] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [saving, setSaving] = useState(false);

  const isVatExempt = discountType === 'SC' || discountType === 'PWD';
  const effectivePercent = isVatExempt ? 20 : (parseFloat(promoPercent) || 0);

  const computation = useMemo(() => {
    if (isVatExempt) {
      const vatExclusive = Math.round((total / (1 + VAT_RATE)) * 100) / 100;
      const vatRemoved = Math.round((total - vatExclusive) * 100) / 100;
      const discountAmount = Math.round(vatExclusive * 0.20 * 100) / 100;
      const finalAmount = Math.round((vatExclusive - discountAmount) * 100) / 100;
      return { vatExclusive, vatRemoved, discountAmount, finalAmount };
    } else {
      const pct = parseFloat(promoPercent) || 0;
      const discountAmount = Math.round(total * (pct / 100) * 100) / 100;
      const finalAmount = Math.round((total - discountAmount) * 100) / 100;
      return { vatExclusive: total, vatRemoved: 0, discountAmount, finalAmount };
    }
  }, [total, isVatExempt, promoPercent]);

  if (total <= 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <p className="font-display text-lg font-bold text-foreground text-center mb-4">
            Cannot apply discount to ₱0.00 order
          </p>
          <button onClick={onCancel} className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-display font-bold active:scale-[0.97] transition-transform">
            OK
          </button>
        </div>
      </div>
    );
  }

  const handleSelectType = (type: DiscountType) => {
    setDiscountType(type);
    if (type === 'SC' || type === 'PWD') {
      setStep('info');
    } else {
      setStep('promo-config');
    }
  };

  const handleInfoSubmit = () => {
    if (!customerName.trim() || !idNumber.trim()) {
      toast.error('Customer name and ID number are required');
      return;
    }
    setStep('pin');
  };

  const handlePromoConfigSubmit = () => {
    const pct = parseFloat(promoPercent);
    if (!pct || pct <= 0 || pct > 100) {
      toast.error('Enter a valid discount percentage (1-100)');
      return;
    }
    if (discountType === 'EMP' && !customerName.trim()) {
      toast.error('Employee name is required');
      return;
    }
    setStep('pin');
  };

  const handlePinSubmit = () => {
    if (pin !== SUPERVISOR_PIN) {
      setPinError(true);
      setPin('');
      return;
    }
    setPinError(false);
    setStep('breakdown');
  };

  const handleConfirm = async () => {
    if (!discountType) return;
    setSaving(true);

    try {
      if (isVatExempt) {
        await supabase.from('sc_pwd_log').insert({
          sale_id: saleId,
          customer_name: customerName.trim(),
          id_number: idNumber.trim(),
          discount_amount: computation.discountAmount,
          vat_removed: computation.vatRemoved,
          approved_by: 'SUPERVISOR',
          processed_by: 'CASHIER',
        });
      }

      const { data: dtData } = await supabase
        .from('discount_types')
        .select('id')
        .eq('discount_code', discountType)
        .single();

      if (dtData) {
        await supabase.from('sales_discounts').insert({
          sale_id: saleId,
          discount_type_id: dtData.id,
          customer_name: customerName.trim() || null,
          id_number: idNumber.trim() || null,
          discount_amount: computation.discountAmount,
          vat_removed_amount: computation.vatRemoved,
        });
      }

      onApplyDiscount({
        discountType,
        customerName: customerName.trim(),
        idNumber: idNumber.trim(),
        originalTotal: total,
        vatRemoved: computation.vatRemoved,
        vatExclusive: computation.vatExclusive,
        discountAmount: computation.discountAmount,
        finalAmount: computation.finalAmount,
        approvedBy: 'SUPERVISOR',
        discountPercent: effectivePercent,
      });
    } catch (err) {
      toast.error('Failed to save discount record');
    } finally {
      setSaving(false);
    }
  };

  const copyManualOR = () => {
    const label = discountType === 'SC' ? 'SC' : discountType === 'PWD' ? 'PWD' : discountType === 'EMP' ? 'Employee' : 'Promo';
    const text = isVatExempt
      ? `VAT-Exempt Sale: ₱${computation.finalAmount.toFixed(2)}\nLess ${label} Discount: ₱${computation.discountAmount.toFixed(2)}`
      : `Sale: ₱${total.toFixed(2)}\nLess ${label} Discount (${effectivePercent}%): ₱${computation.discountAmount.toFixed(2)}\nFinal: ₱${computation.finalAmount.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const typeLabel = (t: DiscountType | null) => {
    switch (t) {
      case 'SC': return 'Senior Citizen';
      case 'PWD': return 'PWD';
      case 'PROMO': return 'Promotional';
      case 'EMP': return 'Employee';
      default: return '';
    }
  };

  // ─── STEP: Select discount type ───
  if (step === 'select') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck size={22} className="text-accent" />
              Apply Discount
            </h2>
            <button onClick={onCancel} className="text-foreground/30 active:text-foreground p-1">
              <X size={20} />
            </button>
          </div>

          <p className="font-display text-sm text-muted-foreground mb-1">Order Total (VAT-Inclusive)</p>
          <p className="font-display text-3xl font-bold text-foreground mb-6">₱{total.toFixed(2)}</p>

          <p className="font-display text-xs text-muted-foreground uppercase tracking-wide mb-2">Statutory (VAT-Exempt)</p>
          <div className="space-y-2 mb-4">
            <button onClick={() => handleSelectType('SC')} className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
              <ShieldCheck size={18} />
              Senior Citizen (20%)
            </button>
            <button onClick={() => handleSelectType('PWD')} className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
              <ShieldCheck size={18} />
              PWD (20%)
            </button>
          </div>

          <p className="font-display text-xs text-muted-foreground uppercase tracking-wide mb-2">Non-Statutory</p>
          <div className="space-y-2">
            <button onClick={() => handleSelectType('PROMO')} className="w-full h-14 bg-foreground/10 text-foreground rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform flex items-center justify-center gap-2 border border-foreground/10">
              <Tag size={18} />
              Promotional Discount
            </button>
            <button onClick={() => handleSelectType('EMP')} className="w-full h-14 bg-foreground/10 text-foreground rounded-xl font-display font-bold text-base active:scale-[0.97] transition-transform flex items-center justify-center gap-2 border border-foreground/10">
              <Users size={18} />
              Employee Discount
            </button>
          </div>

          <button onClick={onCancel} className="w-full mt-4 h-11 text-foreground/40 font-display font-semibold active:scale-[0.97] transition-transform">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: Customer info (SC/PWD) ───
  if (step === 'info') {
    const label = typeLabel(discountType);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setStep('select')} className="text-foreground/40 active:text-foreground p-1"><ArrowLeft size={20} /></button>
            <h2 className="font-display text-xl font-bold text-foreground">{label} — Customer Info</h2>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">Customer Name *</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} maxLength={100}
                className="w-full h-12 mt-1 px-4 bg-background border-2 border-foreground/10 rounded-xl font-body text-foreground focus:border-accent focus:outline-none transition-colors" placeholder="Full name" autoFocus />
            </div>
            <div>
              <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">ID Number *</label>
              <input type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)} maxLength={50}
                className="w-full h-12 mt-1 px-4 bg-background border-2 border-foreground/10 rounded-xl font-body text-foreground focus:border-accent focus:outline-none transition-colors" placeholder="SC / PWD ID No." />
            </div>
            <div>
              <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">ID Type</label>
              <div className="h-12 mt-1 px-4 bg-foreground/5 border-2 border-foreground/10 rounded-xl flex items-center font-display font-semibold text-foreground">{label}</div>
            </div>
          </div>
          <button onClick={handleInfoSubmit} disabled={!customerName.trim() || !idNumber.trim()}
            className="w-full h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
            Next — Supervisor Approval
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: Promo/Employee config ───
  if (step === 'promo-config') {
    const isEmp = discountType === 'EMP';
    const label = typeLabel(discountType);
    const pct = parseFloat(promoPercent) || 0;
    const previewDiscount = Math.round(total * (pct / 100) * 100) / 100;
    const previewFinal = Math.round((total - previewDiscount) * 100) / 100;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => { setStep('select'); setPromoPercent(''); setCustomerName(''); }} className="text-foreground/40 active:text-foreground p-1"><ArrowLeft size={20} /></button>
            <h2 className="font-display text-xl font-bold text-foreground">{label} Discount</h2>
          </div>

          <p className="font-display text-sm text-muted-foreground mb-1">Order Total</p>
          <p className="font-display text-2xl font-bold text-foreground mb-5">₱{total.toFixed(2)}</p>

          <div className="space-y-4 mb-5">
            {isEmp && (
              <div>
                <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">Employee Name *</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} maxLength={100}
                  className="w-full h-12 mt-1 px-4 bg-background border-2 border-foreground/10 rounded-xl font-body text-foreground focus:border-accent focus:outline-none transition-colors" placeholder="Employee full name" autoFocus />
              </div>
            )}
            <div>
              <label className="font-display text-xs font-semibold text-foreground/60 uppercase tracking-wide">Discount Percentage *</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="number" value={promoPercent} onChange={e => setPromoPercent(e.target.value)} min={1} max={100} step={1}
                  className="flex-1 h-14 px-4 bg-background border-2 border-foreground/10 rounded-xl font-display text-2xl text-foreground text-center focus:border-accent focus:outline-none transition-colors"
                  placeholder="0" autoFocus={!isEmp} />
                <Percent size={24} className="text-foreground/40 shrink-0" />
              </div>
              {/* Quick percentage buttons */}
              <div className="flex gap-2 mt-2">
                {[5, 10, 15, 20, 25, 50].map(p => (
                  <button key={p} onClick={() => setPromoPercent(String(p))}
                    className={`flex-1 h-9 rounded-lg font-display font-semibold text-xs active:scale-[0.95] transition-transform border ${promoPercent === String(p) ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-foreground/60 border-foreground/10'}`}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live preview */}
          {pct > 0 && pct <= 100 && (
            <div className="bg-background rounded-xl border border-foreground/10 p-3 mb-5 font-mono text-xs space-y-1">
              <div className="flex justify-between"><span className="text-foreground/60">Discount ({pct}%)</span><span className="font-bold text-accent">−₱{previewDiscount.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-dashed border-foreground/10 pt-1"><span className="font-bold text-foreground">Final Amount</span><span className="font-bold text-foreground">₱{previewFinal.toFixed(2)}</span></div>
            </div>
          )}

          <button onClick={handlePromoConfigSubmit} disabled={!pct || pct <= 0 || pct > 100 || (isEmp && !customerName.trim())}
            className="w-full h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
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
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setStep(isVatExempt ? 'info' : 'promo-config')} className="text-foreground/40 active:text-foreground p-1"><ArrowLeft size={20} /></button>
            <h2 className="font-display text-xl font-bold text-foreground">Supervisor Approval</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">Enter supervisor PIN to authorize {typeLabel(discountType)} discount</p>
          <input type="password" value={pin} onChange={e => { setPin(e.target.value); setPinError(false); }} maxLength={8}
            className={`w-full h-14 px-4 bg-background border-2 rounded-xl font-display text-2xl text-center tracking-[0.5em] text-foreground focus:outline-none transition-colors ${pinError ? 'border-accent' : 'border-foreground/10 focus:border-pos-gold'}`}
            placeholder="••••" autoFocus />
          {pinError && <p className="text-accent text-xs font-display font-semibold mt-2 text-center">Incorrect PIN. Try again.</p>}
          <button onClick={handlePinSubmit} disabled={!pin.trim()}
            className="w-full mt-6 h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-30">
            Authorize
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: Breakdown + confirm ───
  if (step === 'breakdown') {
    const label = typeLabel(discountType);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          <h2 className="font-display text-xl font-bold text-foreground text-center mb-1 flex items-center justify-center gap-2">
            <CheckCircle2 size={22} className="text-pos-gold-dark" />
            {label} Discount Breakdown
          </h2>
          <p className="text-center text-muted-foreground text-xs mb-5">
            {isVatExempt ? '🧾 For manual BIR receipt reference' : '🧾 Discount computation summary'}
          </p>

          <div className="bg-background rounded-xl border-2 border-foreground/10 p-5 mb-4 font-mono text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-foreground/60">{isVatExempt ? 'Original Total (VAT-Inclusive)' : 'Order Total'}</span>
              <span className="font-bold text-foreground">₱{total.toFixed(2)}</span>
            </div>
            {isVatExempt && (
              <>
                <div className="flex justify-between">
                  <span className="text-foreground/60">VAT Removed (12%)</span>
                  <span className="font-bold text-accent">₱{computation.vatRemoved.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">VAT-Exclusive Sales</span>
                  <span className="font-bold text-foreground">₱{computation.vatExclusive.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-foreground/60">Less: {label} Discount ({effectivePercent}%)</span>
              <span className="font-bold text-accent">₱{computation.discountAmount.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-dashed border-foreground/15 pt-2 mt-2 flex justify-between">
              <span className="font-bold text-foreground">FINAL AMOUNT DUE</span>
              <span className="font-bold text-2xl text-foreground">₱{computation.finalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer/Employee info */}
          {(customerName || idNumber) && (
            <div className="bg-foreground/5 rounded-lg p-3 mb-4 text-sm space-y-1">
              {customerName && (
                <div className="flex justify-between">
                  <span className="text-foreground/50">{discountType === 'EMP' ? 'Employee Name' : 'Customer Name'}</span>
                  <span className="font-display font-semibold text-foreground">{customerName}</span>
                </div>
              )}
              {idNumber && (
                <div className="flex justify-between">
                  <span className="text-foreground/50">ID No.</span>
                  <span className="font-display font-semibold text-foreground">{idNumber}</span>
                </div>
              )}
            </div>
          )}

          {/* BIR disclaimer for VAT-exempt */}
          {isVatExempt && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-5 text-[11px] text-accent leading-relaxed text-center">
              THIS IS NOT A VALID OFFICIAL RECEIPT.<br />
              A BIR-REGISTERED MANUAL RECEIPT WILL BE ISSUED.
            </div>
          )}

          <button onClick={copyManualOR}
            className="w-full h-10 mb-3 border-2 border-foreground/10 rounded-lg font-display text-xs font-semibold text-foreground/50 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
            <Copy size={14} />
            Copy Manual OR Format
          </button>

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 h-14 border-2 border-foreground/15 text-foreground/40 rounded-xl font-display font-semibold active:scale-[0.97] transition-transform">
              Cancel Discount
            </button>
            <button onClick={handleConfirm} disabled={saving}
              className="flex-[2] h-14 bg-pos-gold text-primary rounded-xl font-display font-bold text-lg active:scale-[0.97] transition-transform disabled:opacity-50">
              {saving ? 'Saving...' : 'Confirm & Proceed'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DiscountFlow;
